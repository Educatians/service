Baucis Change Log
=================

v0.6.13
-------

Allow pushing to embedded arrays using positional $
  * Validation is ignored
  * Paths with positional $ must be whitelisted
  * Embedded array must be specified in the conditions query parameter

    var controller = baucis.rest({
      singular: 'arbitrary',
      'allow push': 'arr.$.pirates'
    });

    // Later...
    // PUT /api/v1/arbitraries/1234567890abcdef12345678?conditions={ "arr.flag": "jolly roger" }
    // X-Baucis-Put: true
    // BODY
    //   { "arr.$.pirates": { name: 'Blue beard' } }

v0.6.12
-------

Added X-Baucis-Push header for PUTs
 * Setting this uses $push on the body rather than $set for the update
 * Validation is ignored
 * Feature must be enabled per-controller
 * Fields must be whitelisted by setting the 'allow push' controller option, e.g.

    var controller = baucis.rest({ 
      singular: 'arbitrary', 
      'allow push': 'field some.path some.other.path' 
    });
