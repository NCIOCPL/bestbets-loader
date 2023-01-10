#!/bin/bash

set -e

## Use the Environment var or the default
if [[ -z "${ELASTIC_SEARCH_HOST}" ]]; then
    ELASTIC_HOST="http://localhost:9200"
else
    ELASTIC_HOST=${ELASTIC_SEARCH_HOST}
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

## Wait until docker is up.
echo "Waiting for ES Service at ${ELASTIC_HOST} to Start"
until $(curl --output /dev/null --silent --head --fail "${ELASTIC_HOST}"); do
    printf '.'
    sleep 1
done
echo "ES Service is up"

# First wait for ES to start...
response=$(curl --write-out %{http_code} --silent --output /dev/null "${ELASTIC_HOST}")

until [ "$response" = "200" ]; do
    response=$(curl --write-out %{http_code} --silent --output /dev/null "${ELASTIC_HOST}")
    >&2 echo "Elastic Search is unavailable - sleeping"
    sleep 1
done

# next wait for ES status to turn to Green
health_check="curl -fsSL ${ELASTIC_HOST}/_cat/health?h=status"
health=$(eval $health_check)
echo "Waiting for ES status to be ready"
until [[ "$health" = 'green' ]]; do
    >&2 echo "Elastic Search is unavailable - sleeping"
    sleep 10
    health=$(eval $health_check)
done
echo "ES status is green"

pushd $(dirname $(dirname $DIR))
echo "Load the index mapping and data"

export NODE_CONFIG="                                                                \
  {                                                                                 \
    \"pipeline\": {                                                                 \
        \"source\": {                                                               \
            \"module\": \"./lib/sources/github-bestbets-source\",                   \
            \"config\": {                                                           \
                \"repoUrl\": \"https://github.com/nciocpl/bestbets-content\",       \
                \"ref\": \"integration-testing\",                                   \
                \"resourcesPath\": \"/content\"                                     \
            }                                                                       \
        },                                                                          \
        \"transformers\": [                                                         \
            {                                                                       \
                \"module\": \"./lib/transformers/category-to-match-transformer\",   \
                \"config\": {                                                       \
                    \"eshosts\": [ \"http://localhost:9200\" ],                     \
                    \"settingsPath\": \"es-mappings/settings.json\",                \
                    \"analyzer\": \"nostem\"                                        \
                }                                                                   \
            }                                                                       \
        ],                                                                          \
        \"loader\": {                                                               \
            \"module\": \"./lib/loaders/elastic-bestbets-loader\",                  \
            \"config\": {                                                           \
              \"eshosts\": [ \"http://localhost:9200\" ],                           \
              \"daysToKeep\": 10,                                                   \
              \"aliasName\": \"bestbets_v1\",                                       \
              \"mappingPath\": \"es-mappings/mappings.json\",                       \
              \"settingsPath\": \"es-mappings/settings.json\"                       \
            }                                                                       \
        }                                                                           \
    }                                                                               \
  }                                                                                 \
"
node index.js
popd
