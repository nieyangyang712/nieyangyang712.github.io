define(
	[
		"qunit",
		"bmt/BmtStruct"
	],
	function(q, _)
	{
		q.module("bmt struct");
		
		function checkPsetting(psetting)
		{
			console.assert(typeof(psetting) === 'object', '必须提供psetting，哪怕是个空对象，{}');
			if(typeof(psetting.littleEndian) === 'undefined')
				psetting.littleEndian = true; //如果没有提供，则默认为true
			if(typeof(psetting.code) === 'undefined')
				psetting.code = 'ansi'; //如果没有提供，则默认为'ansi'
		}
		function UnpackAssert(psetting, assert, type, bytes, e, desc)
		{
			checkPsetting(psetting);
			var ctx = new BmtStruct.Context((new Uint8Array(bytes)).buffer);
			assert.deepEqual(type.unpack(ctx, psetting), e, desc);
			assert.equal(0, ctx.Left(), desc + ' unpack, ' + ctx.Left() + 'bytes left');
		}

		function PackAssert(psetting, assert, type, v, e, desc)
		{
			checkPsetting(psetting);
			var buf = new Uint8Array(new ArrayBuffer(type.size(psetting, v)));
			var ctx = new BmtStruct.Context(buf.buffer);
			type.pack(ctx, psetting, v);
			assert.deepEqual(new Uint8Array(ctx.dv.buffer), new Uint8Array(e), desc);
		}
		q.test("simple struct test", function(assert) 
		{
			var t = BmtStruct.createStruct(
				BmtStruct._bool("b_1"), //bool b_1;
				BmtStruct._bool("b_2"), //bool b_2;
				BmtStruct._INT8("i8_1"), //int8 i8_1;
				BmtStruct._INT8("i8_2"), //int8 i8_2;
				BmtStruct._INT16("i16"), //int16 i16;
				BmtStruct._INT32("i32"), //int32 i32;
				BmtStruct._char("ch"), //char ch;
				BmtStruct._skip(3), //skip 3
				BmtStruct._float("f"), //float f;
				BmtStruct._double("d"), //double d;
				BmtStruct._string("s_1", 'ansi', 8), //char s_1[8];
				BmtStruct._string("s_2", 'ansi', 2), //char s_2[2];
				BmtStruct._string("s_3", 'ansi', 2), //char s_3[2];
				BmtStruct._string("s", 'ansi'), //string s;
				);
				
			var bytes = [
				0x00, // b_1 = false,0
				0x01, // b_2 = true,1
				0xff, // i8_1 = -1,2
				0x01, // i8_2 = 1,3
				0x01, 0x02, // i16 = 513,4
				0x01, 0x02, 0x03, 0x04, // i32 = 0x04030201,6
				0x61, // ch = 'a',10
				0x00, 0x00, 0x00, // skip 3,11
				0x00, 0x00, 0x80, 0x3f, // f = 1.0,14
				0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x40, // d = 2.5,18
				0xd0, 0xd6, 0xfa, 0xb9, 0x61, 0x62, 0x63, 0x00, // s_1 = "中国abc",26
				0xd0, 0xd6, // s_2 = "中",34
				0x61, 0x00, // s_3 = "a",36
				0x07, 0x00, 0x00, 0x00, 0xd0, 0xd6, 0xfa, 0xb9, 0x61 ,0x62 ,0x63, // s = "中国abc",38
				];
			var e = {
				b_1:false, 
				b_2:true, 
				i8_1:-1, 
				i8_2:1, 
				i16:513, 
				i32:0x04030201, 
				ch:'a', 
				f:1.0, 
				d:2.5, 
				s_1:"中国abc", 
				s_2:"中", 
				s_3:"a", 
				s:"中国abc",
				};
			UnpackAssert({}, assert, t, bytes, e, "unpack");
			assert.equal(t.size({}, e), bytes.length, "size");
			PackAssert({}, assert, t, e, bytes, "pack");

			bytes = [
				0x00, // b_1 = false,0
				0x01, // b_2 = true,1
				0xff, // i8_1 = -1,2
				0x01, // i8_2 = 1,3
				0x02, 0x01, // i16 = 513,4
				0x04, 0x03, 0x02, 0x01, // i32 = 0x04030201,6
				0x61, // ch = 'a',10
				0x00, 0x00, 0x00, // skip 3,11
				0x3f, 0x80, 0x00, 0x00, // f = 1.0,14
				0x40, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // d = 2.5,18
				0xd6, 0xd0, 0xb9, 0xfa, 0x61, 0x62, 0x63, 0x00, // s_1 = "中国abc",26
				0xd6, 0xd0, // s_2 = "中",34
				0x61, 0x00, // s_3 = "a",36
				0x00, 0x00, 0x00, 0x07, 0xd6, 0xd0, 0xb9, 0xfa, 0x61 ,0x62 ,0x63, // s = "中国abc",38
				];
			UnpackAssert({littleEndian:false}, assert, t, bytes, e, "(BE)unpack");
			assert.equal(t.size({littleEndian:false}, e), bytes.length, "(BE)size");
			PackAssert({littleEndian:false}, assert, t, e, bytes, "(BE)pack");
		});

		q.test("nested struct test", function(assert) 
		{
			var t1 = BmtStruct.createStruct(
				BmtStruct._bool("b_1"), //bool b_1;
				BmtStruct._bool("b_2"), //bool b_2;
				BmtStruct._INT8("i8_1"), //int8 i8_1;
				BmtStruct._INT8("i8_2"), //int8 i8_2;
				);
            var t2 = BmtStruct.createStruct(
                BmtStruct._struct("m", t1), // t1 m;
				BmtStruct._string("n", 'ansi'), //string n;
				);
            var t3 = BmtStruct.createStruct(
                BmtStruct._struct("p", t2), // t2 p;
				BmtStruct._string("q", 'ansi'), //string q;
				);
			var bytes = [
				0x00, // b_1 = false
				0x01, // b_2 = true
				0xff, // i8_1 = -1
				0x01, // i8_2 = 1
				0x07, 0x00, 0x00, 0x00, 0xd0, 0xd6, 0xfa, 0xb9, 0x61 ,0x62 ,0x63, // "中国abc"
				0x07, 0x00, 0x00, 0x00, 0xd0, 0xd6, 0xfa, 0xb9, 0x61 ,0x62 ,0x63, // "中国abc"
				];
				
			var e = {
				p: {
					m: {
						b_1: false,
						b_2: true,
						i8_1: -1,
						i8_2: 1,
					},
					n: "中国abc",
				},
				q: "中国abc",
			};
			UnpackAssert({}, assert, t3, bytes, e, "unpack");
			assert.equal(t3.size({}, e), bytes.length, "size");
			PackAssert({}, assert, t3, e, bytes, "pack");

			bytes = [
				0x00, // b_1 = false
				0x01, // b_2 = true
				0xff, // i8_1 = -1
				0x01, // i8_2 = 1
				0x00, 0x00, 0x00, 0x07, 0xd6, 0xd0, 0xb9, 0xfa, 0x61 ,0x62 ,0x63, // "中国abc"
				0x00, 0x00, 0x00, 0x07, 0xd6, 0xd0, 0xb9, 0xfa, 0x61 ,0x62 ,0x63, // "中国abc"
				];
			UnpackAssert({littleEndian:false}, assert, t3, bytes, e, "(BE)unpack");
			assert.equal(t3.size({littleEndian:false}, e), bytes.length, "(BE)size");
			PackAssert({littleEndian:false}, assert, t3, e, bytes, "(BE)pack");
		});

		q.test("array test", function(assert) 
		{
			var t = BmtStruct.createStruct(
				BmtStruct._INT8("i8_1"), //_INT8
				BmtStruct._INT8("i8_2"), //_INT8
			);
            var t2 = BmtStruct.createStruct(
				BmtStruct._array("a", BmtStruct._INT8(""), 2), // int8 a[2]; 
				BmtStruct._array("b", BmtStruct._INT8("")), // vector<int8> b;
				BmtStruct._array("c", BmtStruct._string("", 'ansi')), // vector<string> c;
				BmtStruct._array("d", t, 2), // t d[2];
				BmtStruct._array("e", t), // vector<t> e;
				);
				
			var bytes = [
				0x00, 0x01, // a = [0, 1];
				0x03, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03,// b = [1, 2, 3];
				0x02, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x61, 0x62, 0x63, 0x02, 0x00, 0x00, 0x00, 0x61, 0x62,// c=["abc", "ab"];
				0x01, 0x02, 0x03, 0x04, //d = [{i8_1:1, i8_2:2}, {i8_1:3, i8_2:4}]
				0x01, 0x00, 0x00, 0x00, 0x05, 0x06,// e = [{i8_1:5, i8_2:6}]
				];
			var e = {
				a: [0, 1],
				b: [1, 2, 3],
				c: ["abc", "ab"],
				d: [{i8_1:1, i8_2:2}, {i8_1:3, i8_2:4}],
				e: [{i8_1:5, i8_2:6}],
			};
			UnpackAssert({}, assert, t2, bytes, e, "unpack");
			assert.equal(t2.size({}, e), bytes.length, "size");
			PackAssert({}, assert, t2, e, bytes, "pack");

			bytes = [
				0x00, 0x01, // a = [0, 1];
				0x00, 0x00, 0x00, 0x03, 0x01, 0x02, 0x03,// b = [1, 2, 3];
				0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03, 0x61, 0x62, 0x63, 0x00, 0x00, 0x00, 0x02, 0x61, 0x62,// c=["abc", "ab"];
				0x01, 0x02, 0x03, 0x04, //d = [{i8_1:1, i8_2:2}, {i8_1:3, i8_2:4}]
				0x00, 0x00, 0x00, 0x01, 0x05, 0x06,// e = [{i8_1:5, i8_2:6}]
				];			UnpackAssert({littleEndian:false}, assert, t2, bytes, e, "(BE)unpack");
			assert.equal(t2.size({littleEndian:false}, e), bytes.length, "(BE)size");
			PackAssert({littleEndian:false}, assert, t2, e, bytes, "(BE)pack");
		});

		q.test("set and map test", function(assert) 
		{
			var SetType = BmtStruct._set("", BmtStruct._INT8()); //set<_INT8>
			var bytes = [0x02, 0x00, 0x00, 0x00, 0x01, 0x02];
			var a = new Set([1, 2]);
			UnpackAssert({}, assert, SetType, bytes, a, "set unpack");
			assert.equal(SetType.size({}, a), bytes.length, "set size");
			UnpackAssert({}, assert, SetType, [0x02, 0x00, 0x00, 0x00, 0x02, 0x01], a, "set unpack, equal, although order mismatch");
			UnpackAssert({}, assert, SetType, [0x03, 0x00, 0x00, 0x00, 0x02, 0x01, 0x01], a, "set unpack, equal, although duplicated");
			UnpackAssert({}, assert, SetType, [0x03, 0x00, 0x00, 0x00, 0x02, 0x01, 0x03], new Set([1, 2, 3]), "set unpack, equal");
			PackAssert({}, assert, SetType, a, bytes, "set pack");

			bytes = [0x00, 0x00, 0x00, 0x02, 0x01, 0x02];
			UnpackAssert({littleEndian:false}, assert, SetType, bytes, a, "(BE)set unpack");
			assert.equal(SetType.size({littleEndian:false}, a), bytes.length, "(BE)set size");
			PackAssert({littleEndian:false}, assert, SetType, a, bytes, "(BE)set pack");
			
			var MapType = BmtStruct._map("", BmtStruct._INT8(), BmtStruct._string("", 'ansi')); //map<_INT8, string>
			var c = new Map([[1,'one'], [2, 'two']]);
			bytes = [0x02, 0x00, 0x00, 0x00, 0x01, 0x03, 0x00, 0x00, 0x00, 0x6f, 0x6e, 0x65, 0x02, 0x03, 0x00, 0x00, 0x00, 0x74, 0x77, 0x6f];
			UnpackAssert({}, assert, MapType, bytes, c, "map unpack");
			assert.equal(MapType.size({}, c), bytes.length, "map size");
			PackAssert({}, assert, MapType, c, bytes, "map pack");

			bytes = [0x00, 0x00, 0x00, 0x02, 0x01, 0x00, 0x00, 0x00, 0x03, 0x6f, 0x6e, 0x65, 0x02, 0x00, 0x00, 0x00, 0x03, 0x74, 0x77, 0x6f];
			UnpackAssert({littleEndian:false}, assert, MapType, bytes, c, "(BE)map unpack");
			assert.equal(MapType.size({littleEndian:false}, c), bytes.length, "(BE)map size");
			PackAssert({littleEndian:false}, assert, MapType, c, bytes, "(BE)map pack");
		});
		q.test("fixed length pack", function(assert) 
		{
			{
				var t = BmtStruct._string("", 'ansi', 5); //char[5]
				PackAssert({}, assert, t, "a", [0x61, 0x00, 0x00, 0x00, 0x00], "string，长度不足，补缺省值");
				PackAssert({}, assert, t, "abcdefg", [0x61, 0x62, 0x63, 0x64, 0x65], "string，长度过多，多余的被截断");
			}
			{
				var t = BmtStruct._array("", BmtStruct._INT16(""), 4); //_INT16[4];
				PackAssert({}, assert, t, [1,2], [0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00], "array，长度不足，补缺省值");
				PackAssert({}, assert, t, [1,2,3,4,5], [0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00], "array，长度过多");
			}
			{
				var s = BmtStruct.createStruct(
					BmtStruct._INT16("a"), //_INT16 a;
					BmtStruct._INT16("b"), //_INT16 b;
				);
				var t = BmtStruct._array("", s, 3); //s[3];
				PackAssert({}, assert, t, [{a:1,b:2}, {a:3, b:4}], [0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00], "struct array，长度不足，补缺省值");
				PackAssert({}, assert, t, [{a:1,b:2}, {a:3, b:4},{a:5,b:6}, {a:7, b:8}], [0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00], "struct array，长度过多");
				PackAssert({}, assert, t, [{a:1,c:2}, {a:3, b:4}], [0x01, 0x00, 0x00, 0x00, 0x03, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00], "struct array，字段不存在，补缺省值");
			}
		});
		q.test("extend type value", function(assert) 
		{
			var v = new BmtStruct.Int64('fedcba0987654321');
			var v2 = new BmtStruct.Int64(new Uint8Array([0x21, 0x43, 0x65, 0x87, 0x09, 0xba, 0xdc, 0xfe]), true); //小端机方式
			assert.equal(v.toOctetString(), v2.toOctetString(), "以Uint8Array方式（小端机），构造Int64正确");
			v2 = new BmtStruct.Int64(new Uint8Array([0xfe, 0xdc, 0xba, 0x09, 0x87, 0x65, 0x43, 0x21]), false); //大端机方式
			assert.equal(v.toOctetString(), v2.toOctetString(), "以Uint8Array方式（大端机），构造Int64正确");
			
			v = new BmtStruct.LTMSEL(1553145725000); //20190321132205
			v2 = new Date('2019-03-21T05:22:05.000Z');
			assert.equal(v.toString(), v2.toString(), "BmtStruct.LTMSEL构造正确");

			var a = new Set([1, 2]);
			var b = new Set([1]);
			b.add(2);
			assert.deepEqual(a, b, "basic set equal");
			
			var c = new Map([[1,'one'], [2, 'two']]);
			var d = new Map();
			d.set(1, 'one');
			assert.notDeepEqual(c, d, "basic map equal");
			d.set(2, 'two');
			assert.deepEqual(c, d, "basic map equal");
			d.set(1, 'm');
			assert.notDeepEqual(c, d, "basic map not equal");
		});
		
		q.test("extend type pack and unpack", function(assert) 
		{
			var t, v, bytes;
			t = BmtStruct.SimpleType._INT64;
			v = new BmtStruct.Int64('1234567890abcdef');
			bytes = [0xef, 0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12];
			UnpackAssert({}, assert, t, bytes, v, "INT64 unpack");
			PackAssert({}, assert, t, v, bytes, "INT64 pack");
			bytes = [0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef];
			UnpackAssert({littleEndian:false}, assert, t, bytes, v, "(BE)INT64 unpack");
			PackAssert({littleEndian:false}, assert, t, v, bytes, "(BE)INT64 pack");
			
			v = new BmtStruct.Int64('efcdab9078563412');
			bytes = [0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef];
			UnpackAssert({}, assert, t, bytes, v, "INT64 unpack");
			PackAssert({}, assert, t, v, bytes, "INT64 pack");

			t = BmtStruct.SimpleType._LTMSEL;
			v = new BmtStruct.LTMSEL(1553145725000);
			bytes = [0x48, 0x00, 0xB3, 0x9E, 0x69, 0x01, 0x00, 0x00];
			UnpackAssert({}, assert, t, bytes, v, "LTMSEL unpack");
			PackAssert({}, assert, t, v, bytes, "LTMSEL pack");
			bytes = [0x00, 0x00, 0x01, 0x69, 0x9e, 0xb3, 0x00, 0x48];
			UnpackAssert({littleEndian:false}, assert, t, bytes, v, "(BE)LTMSEL unpack");
			PackAssert({littleEndian:false}, assert, t, v, bytes, "(BE)LTMSEL pack");

			t = BmtStruct._ExHolder("", BmtStruct.SimpleType._astring);
			v = new BmtStruct.ExHolder(false);
			bytes = [0x00];
			UnpackAssert({}, assert, t, bytes, v, "ExHolder unpack, without ex");
			PackAssert({}, assert, t, v, bytes, "ExHolder pack, without ex");
			v = new BmtStruct.ExHolder(true, "timeout");
			bytes = [0x01, 0x07, 0x00, 0x00, 0x00, 0x74, 0x69, 0x6d, 0x65, 0x6f, 0x75, 0x74];
			UnpackAssert({}, assert, t, bytes, v, "ExHolder unpack, with ex");
			PackAssert({}, assert, t, v, bytes, "ExHolder pack, with ex");
			bytes = [0x01, 0x00, 0x00, 0x00, 0x07, 0x74, 0x69, 0x6d, 0x65, 0x6f, 0x75, 0x74];
			UnpackAssert({littleEndian:false}, assert, t, bytes, v, "(BE)ExHolder unpack, with ex");
			PackAssert({littleEndian:false}, assert, t, v, bytes, "(BE)ExHolder pack, with ex");

			var sNonMember = BmtStruct.createStruct(
			);
			t = BmtStruct._ExHolder("", sNonMember);
			v = new BmtStruct.ExHolder(false);
			bytes = [0x00];
			UnpackAssert({}, assert, t, bytes, v, "ExHolder unpack, without ex, exType without member");
			PackAssert({}, assert, t, v, bytes, "ExHolder pack, without ex, exType without member");
			v = new BmtStruct.ExHolder(true, {});
			bytes = [0x01];
			UnpackAssert({}, assert, t, bytes, v, "ExHolder unpack, with ex, exType without member");
			PackAssert({}, assert, t, v, bytes, "ExHolder pack, with ex, exType without member");

			var t2 = BmtStruct.createStruct(
				BmtStruct._bool("b"), //bool b;
				BmtStruct._INT32("i"), //int32 i;
				);
			t = BmtStruct.createStruct(
				BmtStruct._string("s", 'ansi'), //string s_1
				BmtStruct._Binary("bin", t2), //vector<char>，但具体内容的类型是t2
			);
			v = {s: 'abc', bin: {b: true, i: 2} };
			bytes = [0x03, 0x00, 0x00, 0x00, 0x61, 0x62, 0x63, 0x05, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x00, 0x00];
			UnpackAssert({}, assert, t, bytes, v, "struct unpack, with vector<char> memeber");
			PackAssert({}, assert, t, v, bytes, "struct pack, with vector<char> memeber");
			
			t = BmtStruct.SimpleType._ustring;
			v = "abc中国123";
			bytes = [0x10, 0x00, 0x00, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00, 0x2d, 0x4e, 0xfd, 0x56, 0x31, 0x00, 0x32, 0x00, 0x33, 0x00];
			UnpackAssert({}, assert, t, bytes, v, "ustring unpack");
			PackAssert({}, assert, t, v, bytes, "ustring pack");
			v = "";
			bytes = [0x00, 0x00, 0x00, 0x00];
			UnpackAssert({}, assert, t, bytes, v, "empty ustring unpack");
			PackAssert({}, assert, t, v, bytes, "empty ustring pack");
			bytes = [0xff, 0xff, 0xff, 0xff]; //qt的空字符串，打包的结果
			UnpackAssert({}, assert, t, bytes, v, "qt empty ustring unpack");

			v = new Uint8Array([0x01, 0xff]);
			bytes = [0x02, 0x00, 0x00, 0x00, 0x01, 0xff];
			UnpackAssert({}, assert, BmtStruct.SimpleType._uint8array, bytes, v, "uint8array unpack");
			PackAssert({}, assert, BmtStruct.SimpleType._uint8array, v, bytes, "uint8array pack");
			bytes = [0x00, 0x00, 0x00, 0x02, 0x01, 0xff];
			UnpackAssert({littleEndian:false}, assert, BmtStruct.SimpleType._uint8array, bytes, v, "(BE)uint8array unpack");
			PackAssert({littleEndian:false}, assert, BmtStruct.SimpleType._uint8array, v, bytes, "(BE)uint8array pack");
		});
		
		q.test("enum type pack and unpack", function(assert) 
		{
			var t, v, bytes;
			t = BmtStruct.createEnum({
				Unknown: -2,
				Continue: 100,
				Processing: 101,
				OK: 200,
				Created: 201,
				NotFound: 404,
			});
			v = t.Unknown;
			bytes = [0xfe, 0xff, 0xff, 0xff];
			UnpackAssert({}, assert, t, bytes, v, "enum unpack");
			PackAssert({}, assert, t, v, bytes, "enum pack");
			bytes = [0xff, 0xff, 0xff, 0xfe];
			UnpackAssert({littleEndian:false}, assert, t, bytes, v, "(BE)enum unpack");
			PackAssert({littleEndian:false}, assert, t, v, bytes, "(BE)enum pack");
			
			v = t.Continue;
			bytes = [0x64, 0x00, 0x00, 0x00];
			UnpackAssert({}, assert, t, bytes, v, "enum unpack");
			PackAssert({}, assert, t, v, bytes, "enum pack");
			bytes = [0x00, 0x00, 0x00, 0x64];
			UnpackAssert({littleEndian:false}, assert, t, bytes, v, "(BE)enum unpack");
			PackAssert({littleEndian:false}, assert, t, v, bytes, "(BE)enum pack");

			var t2 = BmtStruct.createStruct(
				BmtStruct._INT32("i"), //int32 i;
				BmtStruct._enum("e", t), //t e;
			);
			bytes = [0x01, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00];
			v = {
				i: 1,
				e: t.Continue
			};
			UnpackAssert({}, assert, t2, bytes, v, "enum unpack as struct memeber");
			PackAssert({}, assert, t2, v, bytes, "enum pack as struct memeber");
			bytes = [0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x64];
			UnpackAssert({littleEndian:false}, assert, t2, bytes, v, "(BE)enum unpack as struct memeber");
			PackAssert({littleEndian:false}, assert, t2, v, bytes, "(BE)enum pack as struct memeber");
			
			v = t2.defaultValue;
			bytes = [0x00, 0x00, 0x00, 0x00, 0xfe, 0xff, 0xff, 0xff];
			PackAssert({}, assert, t2, v, bytes, "enum pack as struct memeber, use default value");
			
			v = 33;
			bytes = [0x21, 0x00, 0x00, 0x00];
			assert.throws(
				()=>UnpackAssert({}, assert, t, bytes, v, "enum unpack")
				, "enum unpack wrong value throws error, ok");
			assert.throws(
				()=>PackAssert({}, assert, t, v, bytes, "enum pack")
				, "enum pack wrong value throws error, ok");
		});

		q.test("string test, normal", function(assert) {
			var t = BmtStruct.SimpleType._astring;
			var bytes = [0x07, 0x00, 0x00, 0x00, 0xBA, 0xBA, 0xD6, 0xD7, 0x31, 0x32, 0x33];
			var e = '汉字123';
			var psetting = {};
			UnpackAssert(psetting, assert, t, bytes, e, "le ansi, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "le ansi, size");
			PackAssert(psetting, assert, t, e, bytes, "le ansi, pack");

			t = BmtStruct.SimpleType._ustring;
			bytes = [0x0a, 0x00, 0x00, 0x00, 0x49, 0x6c, 0x57, 0x5b, 0x31, 0x00, 0x32, 0x00, 0x33, 0x00];
			UnpackAssert(psetting, assert, t, bytes, e, "le unicode, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "le unicode, size");
			PackAssert(psetting, assert, t, e, bytes, "le unicode, pack");
			
			t = BmtStruct.SimpleType._utf8string;
			bytes = [0x09, 0x00, 0x00, 0x00, 0x89, 0xb1, 0xe6, 0x97, 0xad, 0xe5, 0x31, 0x32, 0x33];
			UnpackAssert(psetting, assert, t, bytes, e, "le utf8, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "le utf8, size");
			PackAssert(psetting, assert, t, e, bytes, "le utf8, pack");
		});
		q.test("string test, follow type", function(assert) {
			var t = BmtStruct._string('', 'follow');
			var bytes = [0x07, 0x00, 0x00, 0x00, 0xBA, 0xBA, 0xD6, 0xD7, 0x31, 0x32, 0x33];
			var e = '汉字123';
			var psetting = {};
			psetting.code = 'ansi';
			UnpackAssert(psetting, assert, t, bytes, e, "le ansi, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "le ansi, size");
			PackAssert(psetting, assert, t, e, bytes, "le ansi, pack");

			psetting.code = 'unicode';
			bytes = [0x0a, 0x00, 0x00, 0x00, 0x49, 0x6c, 0x57, 0x5b, 0x31, 0x00, 0x32, 0x00, 0x33, 0x00];
			UnpackAssert(psetting, assert, t, bytes, e, "le unicode, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "le unicode, size");
			PackAssert(psetting, assert, t, e, bytes, "le unicode, pack");
			
			psetting.code = 'utf8';
			bytes = [0x09, 0x00, 0x00, 0x00, 0x89, 0xb1, 0xe6, 0x97, 0xad, 0xe5, 0x31, 0x32, 0x33];
			UnpackAssert(psetting, assert, t, bytes, e, "le utf8, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "le utf8, size");
			PackAssert(psetting, assert, t, e, bytes, "le utf8, pack");
		});
		q.test("string test, bigEndian", function(assert) {
			var t = BmtStruct.SimpleType._astring;
			var bytes = [0x00, 0x00, 0x00, 0x07, 0xBA, 0xBA, 0xD7, 0xD6, 0x31, 0x32, 0x33];
			var e = '汉字123';
			var psetting = {littleEndian : false};
			UnpackAssert(psetting, assert, t, bytes, e, "(BE)ansi, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "(BE)ansi, size");
			PackAssert(psetting, assert, t, e, bytes, "(BE)ansi, pack");

			t = BmtStruct.SimpleType._ustring;
			bytes = [0x00, 0x00, 0x00, 0x0a, 0x6c, 0x49, 0x5b, 0x57, 0x00, 0x31, 0x00, 0x32, 0x00, 0x33];
			UnpackAssert(psetting, assert, t, bytes, e, "(BE)unicode, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "(BE)unicode, size");
			PackAssert(psetting, assert, t, e, bytes, "(BE)unicode, pack");
			
			t = BmtStruct.SimpleType._utf8string;
			bytes = [0x00, 0x00, 0x00, 0x09, 0xe6, 0xb1, 0x89, 0xe5, 0xad, 0x97, 0x31, 0x32, 0x33];
			UnpackAssert(psetting, assert, t, bytes, e, "(BE)utf8, unpack");
			assert.equal(t.size(psetting, e), bytes.length, "(BE)utf8, size");
			PackAssert(psetting, assert, t, e, bytes, "(BE)utf8, pack");
		});
		q.test("string test, fixed length", function(assert) {
			var t = BmtStruct._string('', 'ansi', 10);
			var bytes = [0xBA, 0xBA, 0xD6, 0xD7, 0x31, 0x32, 0x33, 0x00, 0x00, 0x00];
			var e = '汉字123';
			var psetting = {littleEndian : true};
			UnpackAssert(psetting, assert, t, bytes, e, "ansi, unpack, larger buffer");
			PackAssert(psetting, assert, t, e, bytes, "ansi, pack, larger buffer");
			t = BmtStruct._string('', 'ansi', 7);
			bytes = [0xBA, 0xBA, 0xD6, 0xD7, 0x31, 0x32, 0x33];
			UnpackAssert(psetting, assert, t, bytes, e, "ansi, unpack, fit buffer");
			PackAssert(psetting, assert, t, e, bytes, "ansi, pack, fit buffer");

			t = BmtStruct._string('', 'ansi', 6);
			UnpackAssert(psetting, assert, t, [0x31, 0x32, 0x33, 0xBA, 0xBA, 0x00], '123汉', "ansi, unpack, short buffer");
			UnpackAssert(psetting, assert, t, [0x31, 0x32, 0x33, 0xBA, 0xBA, 0xD6], '123汉', "ansi, unpack, short buffer");
			PackAssert(psetting, assert, t, '123汉字', [0x31, 0x32, 0x33, 0xBA, 0xBA, 0x00], "ansi, pack, short buffer");
			PackAssert(psetting, assert, t, '12汉字3', [0x31, 0x32, 0xBA, 0xBA, 0xD6, 0xD7], "ansi, pack, short buffer");
			
			e = '汉字123';
			bytes = [0x49, 0x6c, 0x57, 0x5b, 0x31, 0x00, 0x32, 0x00, 0x33, 0x00, 0x00, 0x00];
			t = BmtStruct._string('', 'unicode', 12);
			UnpackAssert(psetting, assert, t, bytes, e, "unicode, unpack, larger buffer");
			PackAssert(psetting, assert, t, e, bytes, "unicode, pack, larger buffer");
			t = BmtStruct._string('', 'unicode', 10);
			bytes = [0x49, 0x6c, 0x57, 0x5b, 0x31, 0x00, 0x32, 0x00, 0x33, 0x00];
			UnpackAssert(psetting, assert, t, bytes, e, "unicode, unpack, fit buffer");
			PackAssert(psetting, assert, t, e, bytes, "unicode, pack, fit buffer");
			t = BmtStruct._string('', 'unicode', 8);
			UnpackAssert(psetting, assert, t, [0x49, 0x6c, 0x57, 0x5b, 0x31, 0x00, 0x32, 0x00], '汉字12', "unicode, unpack, short buffer");
			UnpackAssert(psetting, assert, t, [0x31, 0x00, 0x32, 0x00, 0x33, 0x00, 0x49, 0x6c], '123汉', "unicode, unpack, short buffer");
			PackAssert(psetting, assert, t, '123汉字', [0x31, 0x00, 0x32, 0x00, 0x33, 0x00, 0x49, 0x6c], "unicode, pack, short buffer");
			PackAssert(psetting, assert, t, '12汉字3', [0x31, 0x00, 0x32, 0x00, 0x49, 0x6c, 0x57, 0x5b], "unicode, pack, short buffer");
			t = BmtStruct._string('', 'unicode', 9);
			UnpackAssert(psetting, assert, t, [0x49, 0x6c, 0x57, 0x5b, 0x31, 0x00, 0x32, 0x00, 0x33], '汉字12', "unicode, unpack, short buffer");
			UnpackAssert(psetting, assert, t, [0x31, 0x00, 0x32, 0x00, 0x33, 0x00, 0x49, 0x6c, 0x57], '123汉', "unicode, unpack, short buffer");
			PackAssert(psetting, assert, t, '123汉字', [0x31, 0x00, 0x32, 0x00, 0x33, 0x00, 0x49, 0x6c, 0x00], "unicode, pack, short buffer");
			PackAssert(psetting, assert, t, '12汉字3', [0x31, 0x00, 0x32, 0x00, 0x49, 0x6c, 0x57, 0x5b, 0x00], "unicode, pack, short buffer");
			
			e = '汉字123';
			bytes = [0x89, 0xb1, 0xe6, 0x97, 0xad, 0xe5, 0x31, 0x32, 0x33, 0x00, 0x00, 0x00];
			t = BmtStruct._string('', 'utf8', 12);
			UnpackAssert(psetting, assert, t, bytes, e, "utf8, unpack, larger buffer");
			PackAssert(psetting, assert, t, e, bytes, "utf8, pack, larger buffer");
			t = BmtStruct._string('', 'utf8', 9);
			bytes = [0x89, 0xb1, 0xe6, 0x97, 0xad, 0xe5, 0x31, 0x32, 0x33];
			UnpackAssert(psetting, assert, t, bytes, e, "utf8, unpack, fit buffer");
			PackAssert(psetting, assert, t, e, bytes, "utf8, pack, fit buffer");

			t = BmtStruct._string('', 'utf8', 8);
			UnpackAssert(psetting, assert, t, [0x89, 0xb1, 0xe6, 0x97, 0xad, 0xe5, 0x31, 0x32], '汉字12', "utf8, unpack, short buffer");
			UnpackAssert(psetting, assert, t, [0x31, 0x32, 0x33, 0x89, 0xb1, 0xe6, 0x97, 0xad], '123汉', "utf8, unpack, short buffer");
			psetting.littleEndian = false;
			UnpackAssert(psetting, assert, t, [0xe6, 0xb1, 0x89, 0xe5, 0xad, 0x97, 0x31, 0x32], '汉字12', "be,utf8, unpack, short buffer");
			UnpackAssert(psetting, assert, t, [0x31, 0x32, 0x33, 0xe6, 0xb1, 0x89, 0xe5, 0xad], '123汉', "be,utf8, unpack, short buffer");
			psetting.littleEndian = true;
			PackAssert(psetting, assert, t, '123汉字', [0x31, 0x32, 0x33, 0x89, 0xb1, 0xe6, 0x00, 0x00], "utf8, pack, short buffer");
			PackAssert(psetting, assert, t, '1234汉字', [0x31, 0x32, 0x33, 0x34, 0x89, 0xb1, 0xe6, 0x00], "utf8, pack, short buffer");
			psetting.littleEndian = false;
			PackAssert(psetting, assert, t, '123汉字', [0x31, 0x32, 0x33, 0xe6, 0xb1, 0x89, 0x00, 0x00], "be,utf8, pack, short buffer");
			PackAssert(psetting, assert, t, '1234汉字', [0x31, 0x32, 0x33, 0x34, 0xe6, 0xb1, 0x89, 0x00], "be,utf8, pack, short buffer");
			psetting.littleEndian = true;
		});

		q.test("md5 test", function(assert) 
		{
			var hash = BmtStruct.md5('value');
			assert.equal(hash, "2063c1608d6e0baf80249c42e2be5804", "md5 function ok");
			hash = BmtStruct.md5('\u0076\u0061\u006c\u0075\u0065');
			assert.equal(hash, "2063c1608d6e0baf80249c42e2be5804", "md5 function ok");
			

			var t, v, bytes;
			t = BmtStruct.createStruct(
				BmtStruct._INT32("totalLength"), //总长度，包含头
				BmtStruct._string("sig", 'ansi', 4), //固定字符串"SMSG"
				BmtStruct._INT16("version"), //协议版本号，二字节，高位主版本号，低位次版本号。当前为1.0
				BmtStruct._INT16("category"), //分类，1.应用消息，11.应用节点标识，12.获取活动节点等其它类别
				BmtStruct._INT32("md5code"), //md5码，上述内容（从totalLength到category）的MD5值
			);
			v = {
				totalLength : 0x1c,
				sig : "SMSG",
				version : 0x0100,
				category : 0x000b,
				md5code : BmtStruct.toInt32(0xd7165934),
			};
			bytes = [0x1c, 0x00, 0x00, 0x00, 0x53, 0x4d, 0x53, 0x47, 0x00, 0x01, 0x0b, 0x00, 0x34, 0x59, 0x16, 0xd7];
			UnpackAssert({}, assert, t, bytes, v, "sgHeader unpack");
			PackAssert({}, assert, t, v, bytes, "sgHeader pack");

			function FillSgHeader(ctx, category, totalLength)
			{
				t.pack(ctx, {littleEndian:true,},
				{
					totalLength : totalLength,
					sig : "SMSG",
					version : 0x0100, //版本号1.0
					category : category,
					md5code : 0, //先设置为0
				});
				//计算md5
				var strIn=String.fromCharCode.apply(null, new Uint8Array(ctx.dv.buffer, 0, 12));
				var strMd5Calculated = BmtStruct.md5(strIn, null, true).substr(0, 4);
				//将md5值复制到偏移12字节处
				var md5p = new Uint8Array(ctx.dv.buffer, 12, 4);
				for(let i = 0; i < 4; i++)
					md5p[i] = strMd5Calculated.charCodeAt(i);
			}
			var ctx2 = new BmtStruct.Context(new ArrayBuffer(16));
			FillSgHeader(ctx2, 0xb, 0x1c); //分类是0x0b, 长度是0x1c，这样做出来的sg头才和bytes里面的内容一致
			assert.deepEqual(new Uint8Array(ctx2.dv.buffer), new Uint8Array(bytes), "make sg header ok");
			
			function SgHeaderMd5Check(bytes, asserMsg, assert)
			{
				function rstr2hex(input) {
					var hexTab = '0123456789abcdef'
					var output = ''
					var x
					var i
					for (i = 0; i < input.length; i += 1) {
					  x = input.charCodeAt(i)
					  output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
					}
					return output
				}
				var buf = (new Uint8Array(bytes)).buffer;
				var strIn=String.fromCharCode.apply(null, new Uint8Array(buf, 0, 12));
				var strMd5Calculated = BmtStruct.md5(strIn, null, true).substr(0, 4);
				var strMd5InHeader = String.fromCharCode.apply(null, new Uint8Array(buf, 12, 4));
				assert.equal(strMd5InHeader, strMd5Calculated, asserMsg + ' 1');
				assert.equal(rstr2hex(strMd5InHeader), rstr2hex(strMd5Calculated), asserMsg + ' 2');
			}
			SgHeaderMd5Check(bytes, "check md5 in sgHeader", assert);
			bytes = [0xaa, 0x00, 0x00, 0x00, 0x53, 0x4d, 0x53, 0x47, 0x00, 0x01, 0x0c, 0x00, 0x82, 0x9e, 0x46, 0x3d];
			SgHeaderMd5Check(bytes, "th2nd check md5 in sgHeader", assert);
		});
	}
);