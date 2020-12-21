//     Int64.js
//
//     Copyright (c) 2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

/**
 * Support for handling 64-bit int numbers in Javascript (node.js)
 *
 * JS Numbers are IEEE-754 binary double-precision floats, which limits the
 * range of values that can be represented with integer precision to:
 *
 * 2^^53 <= N <= 2^53
 *
 * Int64 objects wrap a node ArrayBuffer that holds the 8-bytes of int64 data.  These
 * objects operate directly on the buffer which means that if they are created
 * using an existing buffer then setting the value will modify the ArrayBuffer, and
 * vice-versa.
 *
 * Internal Representation
 *
 * The internal buffer format is Big Endian.  I.e. the most-significant byte is
 * at buffer[0], the least-significant at buffer[7].  For the purposes of
 * converting to/from JS native numbers, the value is assumed to be a signed
 * integer stored in 2's complement form.
 *
 * For details about IEEE-754 see:
 * http://en.wikipedia.org/wiki/Double_precision_floating-point_format
 *
 * 原版本为大端机字节序，但是bomit中使用的是小端机字节序，故做相应修改。
 */

define(function()
{
	// Useful masks and values for bit twiddling
	var MASK31 =  0x7fffffff, VAL31 = 0x80000000;
	var MASK32 =  0xffffffff, VAL32 = 0x100000000;

	// Map for converting hex octets to strings
	var _HEX = [];
	for (var i = 0; i < 256; i++) {
	  _HEX[i] = (i > 0xF ? '' : '0') + i.toString(16);
	}

	/**
	* Constructor accepts any of the following argument types:
	*
	* new Int64(Uint8Array) 		- Existing Uint8Array
	* new Int64(string)             - Hex string (throws if n is outside int64 range)
	* new Int64(number)             - Number (throws if n is outside int64 range)
	* new Int64(hi, lo)             - Raw bits as two 32-bit values
	*/
	var Int64 = function(a1, a2) {
		if(a1 instanceof Uint8Array) 
		{
			if(a1.length != 8)
				throw new RangeError(a1  + ' length is not 8');
			this.buffer = new Uint8Array(a1);
			if(typeof(a2) !== "boolean")
				throw new TypeError(a2 + ' is not boolean');
			if(!a2)//不是小端机
			{
				//进行字节序颠倒
				var t;
				var b = this.buffer;
				t = b[7]; b[7] = b[0]; b[0] = t; 
				t = b[6]; b[6] = b[1]; b[1] = t; 
				t = b[5]; b[5] = b[2]; b[2] = t; 
				t = b[4]; b[4] = b[3]; b[3] = t; 
			}				
		} else {
			this.buffer = new Uint8Array(8);
			this.setValue.apply(this, arguments);
		}
	};

	// Max integer value that JS can accurately represent
	Int64.MAX_INT = Math.pow(2, 53);

	// Min integer value that JS can accurately represent
	Int64.MIN_INT = -Math.pow(2, 53);

	Int64.prototype = {

	  constructor: Int64,

	  /**
	   * Do in-place 2's compliment.  See
	   * http://en.wikipedia.org/wiki/Two's_complement
	   */
	  _2scomp: function() {
		var b = this.buffer, carry = 1;
		for(var i = 0; i < 8; i++) {
		  var v = (b[i] ^ 0xff) + carry;
		  b[i] = v & 0xff;
		  carry = v >> 8;
		}
	  },

	  /**
	   * Set the value. Takes any of the following arguments:
	   *
	   * setValue(string) - A hexidecimal string
	   * setValue(number) - Number (throws if n is outside int64 range)
	   * setValue(hi, lo) - Raw bits as two 32-bit values
	   */
	  setValue: function(hi, lo) {
		var negate = false;
		if (arguments.length == 1) {
		  if (typeof(hi) == 'number') {
			// Simplify bitfield retrieval by using abs() value.  We restore sign
			// later
			negate = hi < 0;
			hi = Math.abs(hi);
			lo = hi % VAL32;
			hi = hi / VAL32;
			if (hi > VAL32) throw new RangeError(hi  + ' is outside Int64 range');
			hi = hi | 0;
		  } else if (typeof(hi) == 'string') {
			hi = (hi + '').replace(/^0x/, '');
			lo = hi.substr(-8);
			hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : '';
			hi = parseInt(hi, 16);
			lo = parseInt(lo, 16);
		  } else {
			throw new Error(hi + ' must be a Number or String');
		  }
		}

		// Technically we should throw if hi or lo is outside int32 range here, but
		// it's not worth the effort. Anything past the 32'nd bit is ignored.

		// Copy bytes to buffer
		var b = this.buffer, k = lo;
		for (var i = 0; i < 8; i++) {
		  b[i] = k & 0xff;
		  k = k >>> 8;
		  if(i == 3)
			  k = hi;
		}

		// Restore sign of passed argument
		if (negate) this._2scomp();
	  },

	  /**
	   * Convert to a native JS number.
	   *
	   * WARNING: Do not expect this value to be accurate to integer precision for
	   * large (positive or negative) numbers!
	   *
	   * @param allowImprecise If true, no check is performed to verify the
	   * returned value is accurate to integer precision.  If false, imprecise
	   * numbers (very large positive or negative numbers) will be forced to +/-
	   * Infinity.
	   */
	  toNumber: function(allowImprecise) {
		var b = this.buffer;

		// Running sum of octets, doing a 2's complement
		var negate = b[7] & 0x80, x = 0, carry = 1;
		for (var i = 0, m = 1; i < 8; i++, m *= 256) {
		  var v = b[i];

		  // 2's complement for negative numbers
		  if (negate) {
			v = (v ^ 0xff) + carry;
			carry = v >> 8;
			v = v & 0xff;
		  }

		  x += v * m;
		}

		// Return Infinity if we've lost integer precision
		if (!allowImprecise && x >= Int64.MAX_INT) {
		  return negate ? -Infinity : Infinity;
		}

		return negate ? -x : x;
	  },

	  /**
	   * Convert to a JS Number. Returns +/-Infinity for values that can't be
	   * represented to integer precision.
	   */
	  valueOf: function() {
		return this.toNumber(false);
	  },

	  /**
	   * Return string value
	   *
	   * @param radix Just like Number#toString()'s radix
	   */
	  toString: function(radix) {
		return this.valueOf().toString(radix || 10);
	  },

	  /**
	   * Return a string showing the buffer octets, with MSB on the left.
	   *
	   * @param sep separator string. default is '' (empty string)
	   */
	  toOctetString: function(sep) {
		var out = new Array(8);
		var b = this.buffer;
		for (var i = 0; i < 8; i++) {
		  out[i] = _HEX[b[i]];
		}
		return out.reverse().join(sep || '');
	  },

	  /**
	   * Returns the int64's 8 bytes in a buffer.
	   *
	   * @param {bool} [rawBuffer=false]  If this is true, return the internal buffer.  Should only be used if
	   *                                  you're discarding the Int64 afterwards, as it breaks encapsulation.
	   * @param {bool} littleEndian 小端机字节序
	   */
	  toBuffer: function(rawBuffer, littleEndian) {
		if (typeof(littleEndian) !== "boolean")
			throw TypeError(littleEndian + ' is not boolean');
		if (rawBuffer && littleEndian) 
			return this.buffer;

		if(littleEndian)
			return new Uint8Array(this.buffer);
		
		var result = new Uint8Array(8);
		var b = this.buffer;
		result[0] = b[7]; result[4] = b[3];
		result[1] = b[6]; result[5] = b[2];
		result[2] = b[5]; result[6] = b[1];
		result[3] = b[4]; result[7] = b[0];
		return result;
	  },

	  /**
	   * Returns a number indicating whether this comes before or after or is the
	   * same as the other in sort order.
	   *
	   * @param {Int64} other  Other Int64 to compare.
	   */
	  compare: function(other) {

		// If sign bits differ ...
		if ((this.buffer[7] & 0x80) != (other.buffer[7] & 0x80)) {
		  return other.buffer[7] - this.buffer[7];
		}

		// otherwise, compare bytes lexicographically
		for (var i = 7; i >= 0; i--) {
		  if (this.buffer[i] !== other.buffer[i]) {
			return this.buffer[i] - other.buffer[i];
		  }
		}
		return 0;
	  },

	  /**
	   * Returns a boolean indicating if this integer is equal to other.
	   *
	   * @param {Int64} other  Other Int64 to compare.
	   */
	  equals: function(other) {
		return this.compare(other) === 0;
	  },

	  /**
	   * Pretty output in console.log
	   */
	  inspect: function() {
		return '[Int64 value:' + this + ' octets:' + this.toOctetString(' ') + ']';
	  }
	};
	return Int64;
});