'use strict';
/** V1.3 transport (isolated candidate; CDM-15 pending) + V1.4 strict native parser / native checker. No network, no credential (G53). */
const parse = require('./parse'); const convert = require('./convert'); const native = require('./native_check');
module.exports = { parseModelText: parse.parseModelText, parseStrictNative: parse.parseStrictNative, textFromRawResponse: parse.textFromRawResponse, TransportError: parse.TransportError, convertModelOutput: convert.convertModelOutput, domainOf: convert.domainOf, TOP_ALLOWED: convert.TOP_ALLOWED, checkNative: native.checkNative, NATIVE_TOP: native.TOP };
