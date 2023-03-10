Feature: Category Display queries work as when called by API..

  Background:
    * url esHost

  Scenario Outline: Retrieve category display objects by individual IDs

    * def blob = read('categorydisplay-' + categoryID + '.json')
    * def expected = blob._source

    Given path 'bestbets_v1', '_doc', categoryID
    When method get
    Then status 200
    And match response._source == expected

    Examples:
      | categoryID |
      | 860395     |
      | 1055466    |
      | 1095708    |
