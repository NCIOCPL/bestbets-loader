Feature: Queries used by the Best Bets Match service.

  Background:
    * url esHost

  Scenario Outline: At least '<n>' matching tokens.

    * def body =
      """
      {
        "query": {
          "bool": {
            "must": [
              { "range": { "tokencount": { "lte": 0 } } },
              { "term": { "is_exact": false } },
              { "term": { "language": "en" } },
              { "match": { "synonym": { "query": null, "minimum_should_match": 0 } } },
              { "term": { "record_type": "synonyms" } }
            ]
          }
        },
        "size": 10000
      }
      """
    * body.query.bool.must[0].range.tokencount.lte = maxTokenCount
    * body.query.bool.must[3].match.synonym.minimum_should_match = maxTokenCount
    * body.query.bool.must[3].match.synonym.query = searchTerm

    * def blob = read('match-service-up-to-tokens-' + maxTokenCount + '.json')
    * def expected = get blob.hits.hits[*]._source

    Given path 'bestbets_v1', '_search'
    And request body
    When method get
    Then status 200
    And match response.hits.hits[*]._source == expected


    Examples:
      | maxTokenCount | searchTerm                       |
      | 1             | Time to End Cancer as We Know It |
      | 2             | Time to End Cancer as We Know It |
      | 3             | Time to End Cancer as We Know It |
      | 4             | Time to End Cancer as We Know It |


  Scenario Outline: The exact token count

    * def body =
      """
      {
          "query" : {
              "bool": {
                  "should": [
                      {
                          "bool": {
                              "must": [
                                  {"range": {"tokencount": {"lte": 0}}},
                                  {"term": {"is_exact": false}},
                                  {"term": {"language": "en"}},
                                  {"match": {"synonym": {"query": null, "minimum_should_match": 0}}},
                                  { "term": { "record_type": "synonyms" } }
                              ]
                          }
                      },
                      {
                          "bool": {
                              "must": [
                                  {"term": {"tokencount": 0}},
                                  {"term": {"is_exact": true}},
                                  {"term": {"language": "en"}},
                                  {"match": {"synonym": {"query": null, "minimum_should_match": 0}}},
                                  { "term": { "record_type": "synonyms" } }
                              ]
                          }
                      }
                  ]
              }
          },
          "size": 10000
      }
      """
    * body.query.bool.should[0].bool.must[0].range.tokencount.lte = maxTokenCount
    * body.query.bool.should[0].bool.must[3].match.synonym.minimum_should_match = maxTokenCount
    * body.query.bool.should[0].bool.must[3].match.synonym.query = searchTerm
    * body.query.bool.should[1].bool.must[0].term.tokencount = maxTokenCount
    * body.query.bool.should[1].bool.must[3].match.synonym.minimum_should_match = maxTokenCount
    * body.query.bool.should[1].bool.must[3].match.synonym.query = searchTerm

    * def blob = read('match-service-' + dataFile + '.json')
    * def expected = get blob.hits.hits[*]._source

    Given path 'bestbets_v1', '_search'
    And request body
    When method get
    Then status 200
    And match response.hits.hits[*]._source == expected


    Examples:
      | maxTokenCount | searchTerm                       | dataFile      |
      | 5             | Time to End Cancer as We Know It | exact-5-token |
      | 1             | tumor                            | exact-1-token |
      # CML has synonyms with the exact_match property set true and the category false
      | 4             | Chronic Myelogenous Leukemia CML | exact-match-false  |
      | 3             | chronic myelocytic leukemia      | exact-match-true   |
