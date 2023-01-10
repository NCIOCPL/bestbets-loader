Feature: Token analyzer works as called by API.

  Background:
    * url esHost

  Scenario Outline: Tokenize strings with varying numbers of tokens.

    * def body = { 'analyzer': 'nostem' }
    * body.text = string

    Given path 'bestbets_v1', '_analyze'
    And request body
    When method get
    Then status 200
    And match response == read(expected + '.json')

    Examples:
      | string                            | expected                                |
      | CIS                               | token-analyzer-single-token             |
      | infografías                       | token-analyzer-single-token-spanish     |
      | Time to End Cancer as We Know It  | token-analyzer-multiple-tokens          |
      | Cáncer de faringe                 | token-analyzer-multiple-tokens-spanish  |
      | 18004CANCER                       | token-analyzer-alphanumeric             |
      | 1-800-4-CANCER                    | token-analyzer-phone-number             |
