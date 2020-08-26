# Ask Kodiak Appetite Test Tool

A tool for unit testing appetite on Ask Kodiak.

This command line tool dynamically creates a mocha test suite to unit test appetite configuration on Ask Kodiak using a comma separated value list (CSV) of test cases and expected results.

*tldr;* Configuration (api credentials) go in config.json. Example at `example-config.json`. Test cases go in `tests.csv`. Example at `example-tests.csv`. Run using `npm test`.

## Prerequisites

* Install [Node.js](https://nodejs.org/) version 12 or later following the installation directions provided by Node for your platform.

## Installation

* Clone the repository
* `npm install`
* Create a [config.json](#configuration) file

## Configuration

This tool requires your credentials for the Ask Kodiak API (specifically your Group ID (`gid`) and a Read Key (`key`)) and a target product id (`pid`) for the tests. Add these values to `config.json`. An example configuration file, `example-config.json` has been included for your convenience. Add your `gid` and `key` and `pid` and then save-as `config.json`. Optionally, include also a `url` property to specify target Ask Kodiak API node. In most cases this value need not be set.

## Tests File

This tool dynamically creates a test suite based on the contents of a CSV file. That CSV file should contain 1-n example requests and expected results for each. An example test file has been included with this project as `example-tests.csv`. Add your tests cases and then save-as `tests.csv`.

### Request Parameters

#### Required Request Parameters

1. `code` - the 2-6 digit NAICS code (or NAICS 6 digit code + sub-description MD5 hash) for which appetite should be checked.

#### Optional Request Parameters

1. `geo` - the [ISO 3166-2](https://www.iso.org/standard/63546.html) code representing the country/subdivision in which the risk resides For example `US-MA` or `CA-ON`.
2. `entityType` - the [Business Entity Type Code](https://api.askkodiak.com/doc/v2/#api-Reference_Data-BusinessEntityTypes) describing the business.
3. `annualPayroll` - the annual payroll of the business as an integer.
4. `annualRevenue` - the annual revenue of the business as an integer.
5. `fullTimeEmployees` - the number of employees the business employs on a full time basis as an integer.
6. `partTimeEmployees`- the number of employees the business employs on a part time basis as an integer.
7. `tiv` - the Total Insured Value (TIV) of the risk.
8. `vehicles` - the number of scheduled vehicles as an integer.
9. `locations` - the number of scheduled locations as an integer.
10. `buildings` - the number of scheduled buildings as an integer.
11. `squareFootage` - the total square footage to be insured as an integer.
12. `buildingAge` - the oldest building to be insured in years as an integer.
13. `yearsInBusiness` - years in business as an integer.
14. `yearsInIndustry` - years in industry (i.e. experience) as an integer.

### Test Columns

#### Required Test Columns

1. `expectInAppetite` - 'TRUE' or 'FALSE'. Given the specified request parameters should the product represented by `pid` be in appetite?

#### Optional Test Columns

1. `hasAllTags`- Asserts that product has all and only all of the tags provided. A comma separated list (for example: `'red, blue, green'`)
2. `containsAllTags`- Asserts that product has all of the tags provided but may have more tags not listed. A comma separated list (for example: `'red, blue, green'`)
3. `hasAnyTags` - Asserts that product has at least one of the tags provided. A comma separated list (for example: `'red, blue, green'`)
4. `doesNotHaveAnyTags` - Asserts that product has at none of the tags provided. A comma separated list (for example: `'red, blue, green'`)
5. `doesNotHaveAllTags` - Asserts that product does not have at least one of the tags provided. A comma separated list (for example: `'red, blue, green'`)
6. `doesNotHaveTags` - Asserts that the product does not have any tags. `TRUE` or `FALSE`.

## Running

To execute the tests run `npm test`.

Alternatively, a [VSCode](https://code.visualstudio.com) launch configuration has also been provided to run and debug within VSCode. Use the the launcher called `Test` to run.
