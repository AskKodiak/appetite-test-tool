const tester = require('../index'),
      chai = require('chai'),
      assert = chai.assert;

// using delay flag on mocha execution to acquire data once and then dynamically build suites.
(async () => {
  var results;

  try {
    results = await tester.run();
  } catch (e) {
    console.error(e.message); // eslint-disable-line no-console
    process.exit(-1);
  }

  for (let i = 0; i < results.length; i++) {
    const result = results[i],
          rowNum = result.rowNum,
          test = result.test,
          testPid = result.pid,
          response = result.response,
          products = response.products,
          product = products[0] || {},
          meta = product.meta || {},
          ruleStats = meta['rule-stats'] || {},
          triggered = ruleStats.triggered || {},
          ruleIds = Object.keys(triggered),
          requestParams = test.apiOpts,
          responseFilters = response.filters,
          expectInAppetite = test.expectInAppetite,
          inAppetite = product.id === testPid,
          hasAllTags = test.hasAllTags,
          containsAllTags = test.containsAllTags,
          hasAnyTags = test.hasAnyTags,
          doesNotHaveAnyTags = test.doesNotHaveAnyTags,
          doesNotHaveAllTags = test.doesNotHaveAllTags,
          doesNotHaveTags = test.doesNotHaveTags,
          responseMeta = product.meta || {},
          responseTags = (() => {
            var tagVals = [],
                responseTagsObjArr = responseMeta.tags || [];

            responseTagsObjArr.forEach(responseTabObj => {
              tagVals.push(responseTabObj.text); //take string value of tag and push it to the array
            });

            return tagVals;

          })(), // iife - array. turn the array of tag objects (if any) into an array of tag string values for later testing
          hasTagTest = (() => {
            var tagTestTypes = [hasAnyTags, containsAllTags, hasAllTags, doesNotHaveAnyTags, doesNotHaveAllTags, doesNotHaveTags];

            for (let ix = 0; i < tagTestTypes.length; ix++) {
              let tagTest = tagTestTypes[ix];

              if (typeof test[tagTest] !== undefined) {
                //found one.
                return true;
              }
            }

            return false;

          })(), // iife - boolean - this row has some kind of tag test
          getTriggeredRuleIdsString = () => {
            if (ruleIds.length > 0) {
              return `(triggered rule id(s): ${ruleIds.toString()})`;
            }
            return '';
          };

    describe(`row ${rowNum}`, () => {

      describe('request', () => {
        describe('parameters', () => {
          Object.keys(requestParams).forEach((reqKey) => {
            let reqVal = requestParams[reqKey],
                resVal = responseFilters[reqKey];

            describe(`${reqKey}: ${reqVal}`, () => {
              it('accepted by Ask Kodiak API', () => {
                assert.equal(reqVal, resVal);
              });
            });
          });
        });

      });

      describe(`response ${ getTriggeredRuleIdsString() }`, () => {

        describe('appetite', () => {
          if (expectInAppetite) {
            it('in appetite', () => {
              assert.isTrue(inAppetite);
            });
          } else {
            it('not in appetite', () => {
              assert.isFalse(inAppetite);
            });
          }
        });

        if (hasTagTest) {
          describe(`tags (${responseTags.toString()})`, () => {
            // Asserts that product has all and only all of the tags provided.
            if (hasAllTags) {
              if (hasAllTags.length > 0) {

                for (let ix = 0; ix < responseTags.length; ix++) {
                  let responseTagVal = responseTags[ix],
                      expected = hasAllTags.indexOf(responseTagVal) > -1;

                  it(`Product has all and only all of the tags '${hasAllTags.toString()}': ${responseTagVal}`, () => {
                    assert.isTrue(expected);
                  });
                }

              }
            }
            // Asserts that product has all of the tags provided but may have more tags not listed.
            if (containsAllTags) {
              if (containsAllTags.length > 0) {
                // check each tag
                for (let ix = 0; ix < containsAllTags.length; ix++) {
                  let containsTagVal = containsAllTags[ix],
                      tagFound = responseTags.indexOf(containsTagVal) > -1;

                  it(`product has all of the tags: '${containsTagVal}'`, () => {
                    assert.isTrue(tagFound);
                  });
                }
              }
            }
            //Asserts that product has at least one of the tags provided.
            if (hasAnyTags) {
              if (hasAnyTags.length > 0) {
                let found = (() => {
                  for (let c = 0; c < hasAnyTags.length; c++) {

                    if (responseTags.indexOf(hasAnyTags[c]) > -1) {
                      return true;
                    }
                  }
                  return false;
                })();

                it(`product has at least one of the tags: '${hasAnyTags.toString()}'`, () => {
                  assert.isTrue(found);
                });
              }
            }
            // Asserts that product has at none of the tags provided
            if (doesNotHaveAnyTags) {
              if (doesNotHaveAnyTags.length > 0) {
                for (let ix = 0; ix < doesNotHaveAnyTags.length; ix++) {
                  let doesNotHaveTagVal = doesNotHaveAnyTags[ix],
                      hasTag = responseTags.indexOf(doesNotHaveTagVal) > -1;

                  it(`product has none of the tags: '${doesNotHaveTagVal}'`, () => {
                    assert.isFalse(hasTag);
                  });
                }

              }
            }
            // Asserts that product does not have at least one of the tags provided
            if (doesNotHaveAllTags) {
              if (doesNotHaveAllTags.length > 0) {
                let found = (() => {
                  for (let ix = 0; ix < doesNotHaveAllTags.length; ix++) {
                    let doesNotHaveTagVal = doesNotHaveAllTags[ix];

                    if (responseTags.indexOf(doesNotHaveTagVal) > -1) {
                      // found one.
                      return true;
                    }

                  }

                  return false;

                })();
                it(`product does not have at least one of the tags: '${doesNotHaveAllTags.toString()}'`, () => {
                  assert.isFalse(found);
                });

              }
            }
            // Asserts that the product does not have any tags
            if (typeof doesNotHaveTags !== 'undefined') {
              if (doesNotHaveTags) {
                it('product does not have tags', () => {
                  assert.isEmpty(responseTags);
                });
              } else {
                it('product has tags', () => {
                  assert.isNotEmpty(responseTags);
                });
              }
            }
          });
        }

      });

    });
  }

  run(); //https://mochajs.org/#delayed-root-suite

})();
