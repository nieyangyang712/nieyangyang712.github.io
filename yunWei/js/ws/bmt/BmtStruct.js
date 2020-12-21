"use strict";
define(
	[
		"./ConstMap",
		"./Int64",
		"./md5",
		"./BmtStringPacker",
	],
	function(ConstMap_, Int64_, md5_, _)
	{
		var nextId = 1;
		var returnValue = "if(typeof(vname) === 'undefined') return v; else this[vname] = v;\n"
		var initValue4Undefined = function(defaultValue) { return "if(typeof(v) == 'undefined')v = " + defaultValue + "; \n" }
		var BmtStruct = Object.create(Object.prototype, {
			//布尔型
			//值类型是Boolean
			_bool: { 
				value: function(name) { 
					return { 
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = ctx.dv.getInt8(ctx.offset) != 0; ctx.offset++;\n" + returnValue),
						defaultValue: false,
						size: new Function("psetting", "v", "return 1;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('false') + "ctx.dv.setInt8(ctx.offset, v ? 1 : 0); ctx.offset++;\n"),
					}; 
				}
			},
			//8位整数
			//值类型是Number
			_INT8: { 
				value: function(name, unsinged) { 
					return {
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = ctx.dv.get" + (unsinged ? "Ui" : "I") + "nt8(ctx.offset); ctx.offset++;\n" + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 1;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + "ctx.dv.set" + (unsinged ? "Ui" : "I") + "nt8(ctx.offset, v); ctx.offset++;\n"),
					}; 
				}
			},
			
			//16位整数
			//值类型是Number
			_INT16: { 
				value: function(name, unsinged) { 
					return { 
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = ctx.dv.get" + (unsinged ? "Ui" : "I") + "nt16(ctx.offset, psetting.littleEndian); ctx.offset += 2;\n" + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 2;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + "ctx.dv.set" + (unsinged ? "Ui" : "I") + "nt16(ctx.offset, v, psetting.littleEndian); ctx.offset += 2;\n"),
					};
				}
			},
			
			//32位整数
			//值类型是Number
			_INT32: { 
				value: function(name, unsinged) { 
					return { 
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = ctx.dv.get" + (unsinged ? "Ui" : "I") + "nt32(ctx.offset, psetting.littleEndian); ctx.offset += 4;\n" + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 4;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + "ctx.dv.set" + (unsinged ? "Ui" : "I") + "nt32(ctx.offset, v, psetting.littleEndian); ctx.offset += 4;\n"),
					};
				}
			},

			//4字节浮点数
			//值类型是Number
			_float: { 
				value: function(name) { 
					return { 
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = ctx.dv.getFloat32(ctx.offset, psetting.littleEndian); ctx.offset += 4;\n" + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 4;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + "ctx.dv.setFloat32(ctx.offset, v, psetting.littleEndian); ctx.offset += 4;\n"),
					};
				}
			},
			
			//8字节浮点数
			//值类型是Number
			_double: { 
				value: function(name) { 
					return { 
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = ctx.dv.getFloat64(ctx.offset, psetting.littleEndian); ctx.offset += 8;\n" + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 8;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + "ctx.dv.setFloat64(ctx.offset, v, psetting.littleEndian); ctx.offset += 8;\n"),
					};
				}
			},
			
			//1字节字符
			//值类型是String，长度为1
			_char: { 
				value: function(name) { 
					return { 
						name: name, 
						unpack : new Function("ctx", "psetting", "vname", "var v = String.fromCharCode(ctx.dv.getUint8(ctx.offset)); ctx.offset++;\n" + returnValue),
						defaultValue: '\0',
						size: new Function("psetting", "v", "return 1;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + "ctx.dv.setUint8(ctx.offset, v.charCodeAt(0)); ctx.offset++;\n"),
					}; 
				}
			},

			//64位整数
			//值类型是BmtStruct.Int64
			_INT64: {
				value: function(name) {
					var unpackCode = "var v = new BmtStruct.Int64(new Uint8Array(ctx.dv.buffer, ctx.offset, 8), psetting.littleEndian); ctx.offset += 8;\n";
					var packCode = "(new Uint8Array(ctx.dv.buffer, ctx.offset, 8)).set(v.toBuffer(true, psetting.littleEndian)); ctx.offset += 8;\n";
					return { 
						name:name, 
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 8;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + packCode),
					};
				}
			},
			
			//64位时间
			//值类型是BmtStruct.LTMSEL
			_LTMSEL: {
				value: function(name) {
					var unpackCode = "var m = new BmtStruct.Int64(new Uint8Array(ctx.dv.buffer, ctx.offset, 8), psetting.littleEndian); ctx.offset += 8;\n";
					unpackCode += "var v = new BmtStruct.LTMSEL(m.toNumber());\n";
					var packCode = "var m = new BmtStruct.Int64(v.getTime());\n";
					packCode += "(new Uint8Array(ctx.dv.buffer, ctx.offset, 8)).set(m.toBuffer(true, psetting.littleEndian)); ctx.offset += 8;\n";
					return { 
						name:name, 
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: 0,
						size: new Function("psetting", "v", "return 8;"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('0') + packCode),
					};
				}
			},
			
			//异常容器
			//值类型是BmtStruct.ExHolder
			_ExHolder: {
				value: function(name, type) {
					var unpackCode = "var valid = ctx.dv.getUint8(ctx.offset) != 0; ctx.offset++; \n";
					unpackCode += "var ex; if(valid) ex = " + type.unpack + "(ctx, psetting);\n";
					unpackCode += "var v = new BmtStruct.ExHolder(valid, ex);\n";
					var packCode = "ctx.dv.setUint8(ctx.offset, v.valid ? 1 : 0); ctx.offset++;\n";
					packCode += "if(v.valid) (" + type.pack + ").call(v.ex, ctx, psetting, v.ex);\n";
					return { 
						name:"", //can't be struct member, so don't need name
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: new BmtStruct.ExHolder(false),
						size: new Function("psetting", "v", "if(!v.valid) return 1; return 1 + " + type.size + "(psetting, v.ex);\n"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('new BmtStruct.ExHolder(false)') + packCode),
					};
				}
			},
			
			//二进制数据容器，前四个字节是后续数据的字节长度
			//值类型是type参数
			_Binary: {
				value: function(name, type) {
					var unpackCode = "var len = ctx.dv.getUint32(ctx.offset, psetting.littleEndian) != 0; ctx.offset += 4; \n";
					unpackCode += "var v = " + type.unpack + "(ctx, psetting);\n";
					var packCode = "var len = " + type.size + "(psetting, v); ctx.dv.setUint32(ctx.offset, len, psetting.littleEndian); ctx.offset += 4;\n";
					packCode += "(" + type.pack + ").call(v, ctx, psetting, v);\n";
					return { 
						name: name,
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: null,
						size: new Function("psetting", "v", "return 4 + " + type.size + "(psetting, v);\n"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('null') + packCode),
					};
				}
			},
			
			// 字节数组
			//值类型是Uint8Array
			_uint8array : {
				value: function(name) {
					var unpackCode = "var len = ctx.dv.getUint32(ctx.offset, psetting.littleEndian); ctx.offset += 4; \n";
					unpackCode += "var v = new Uint8Array(ctx.dv.buffer, ctx.offset, len);\n";
					unpackCode += "ctx.offset += len;\n";
					var packCode = "var len = v.length; ctx.dv.setUint32(ctx.offset, len, psetting.littleEndian); ctx.offset += 4;\n";
					packCode += "new Uint8Array(ctx.dv.buffer).set(v, ctx.offset);\n";
					packCode += "ctx.offset += len;\n";
					return { 
						name: name,
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: null,
						size: new Function("psetting", "v", "return 4 + v.length;\n"),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('null') + packCode),
					};
				}
			},
			
			/** 定义字符串成员
			*
			* 值类型是String
			* @param name 属性名。
			* @param code 编码方式 'ansi'--ansi,'unicode'--unicode, 'utf8'--utf8, 'follow'--由psetting中的设置决定
			* @param length 字符串长度，如果变长，则length不设置。
			*               对于定长字符串：解包时，碰到'\0'或者到缓冲区末尾，表示字符串结束。
			*                               打包时，如果缓冲区过大，则空余部分全部置0。如果缓冲区过小，则字符串被截断。
			*                                   对于多字节的最后一个符的多个字节，使用'\0'代替，而不是仅仅丢弃最后一个字符的过多的字节。
			*									例如，utf8打包，'汉'le方式编码为0x97, 0xad, 0xe5，如果只有一个字节空间，则打包为0x00而不是0x97，如果有两个字节空间，则打包为0x00,0x00而不是0x97,0xad
			*/
			_string: {
				value: function(name, code, length) {
					console.assert(code == 'ansi' || code == 'unicode' || code == 'utf8' || code == 'follow', '必须是四种类型之一');
					console.assert(typeof(length) === 'undefined' || typeof(length) === 'number' && length > 0, '如果是定长，则长度必须大于0，如果是变长，则不要提供该参数');
					var buffSize = length || 0; //如果没有指定length，使用0，表示变长
					
					var unpackCode = "var buffSize = " + buffSize + ";\n";
					unpackCode += "var v = BmtStringPacker('" + code + "', psetting).unpack(ctx, psetting, buffSize);\n";
					
					var sizeCode = "return " + (length > 0 ? length : "BmtStringPacker('" + code + "', psetting).vsize(v)") + ";\n"

					var packCode = "var buffSize = " + buffSize + ";\n";
					packCode += "BmtStringPacker('" + code + "', psetting).pack(ctx, psetting, buffSize, v);\n";

					return {
						name: name,
						unpack: new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: "",
						size: new Function("psetting", "v", sizeCode), 
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('""') + packCode),
					};
				}
			},
			
			/** 定义数组的成员
			*
			* 值类型是Array
			* vector,list
			* @param name 属性名。
			* @param type 结构名。
			* @param length 元素长度，如果变长，则length不设置。
			*/
			_array: {
				value: function(name, type, length) {
					var unpackCode = "var len = " + length + ";\n";
					unpackCode += "	if(typeof(len) === 'undefined') {\n";
					unpackCode += "		len = ctx.dv.getUint32(ctx.offset, psetting.littleEndian); ctx.offset += 4;\n";
					unpackCode += "	}\n";
					unpackCode += "	var v = new Array(len);\n";
					unpackCode += "	for(var j = 0; j < len; ++j) {\n";
					unpackCode += "		var av = " + type.unpack + "(ctx, psetting);\n";
					unpackCode += "		v[j] = av;\n";
					unpackCode += "	}\n";
					
					var sizeCode = "";
					if(length > 0)
					{
						sizeCode = "var ret = 0;\n";
						sizeCode += "var fixedLen = " + length + ";\n"; //固定长度
						sizeCode += "var vlen = v.length;\n"; //真实长度
						sizeCode += "var i = 0;\n";
						sizeCode += "for(; i < vlen && i < fixedLen; i++) {\n";
						sizeCode += "	var e = v[i];\n";
						sizeCode += "	ret += " + type.size + "(psetting, e);\n";
						sizeCode += "}\n";
						sizeCode += "for(; i < fixedLen; i++) {\n";
						sizeCode += "	var e = " + type.defaultValue + ";\n";
						sizeCode += "	ret += " + type.size + "(psetting, e);\n";
						sizeCode += "}\n";
					}
					else
					{
						sizeCode = "var ret = 4;\n";
						sizeCode += "var vlen = v.length;\n";
						sizeCode += "for(var i = 0; i < vlen; i++) {\n";
						sizeCode += "	var e = v[i];\n";
						sizeCode += "	ret += " + type.size + "(psetting, e);\n";
						sizeCode += "}\n";
					}
					sizeCode += "return ret;\n";

					var packCode = "";
					if(length > 0) //固定大小
					{
						packCode += "var fixedLen = " + length + ";\n"; //固定长度
						packCode += "var vlen = v.length;\n"; //真实长度
						packCode += "var i = 0;\n";
						packCode += "for(; i < vlen && i < fixedLen; i++) {\n";
						packCode += "	var e = v[i];\n";
						packCode += "	(" + type.pack + ").call(e, ctx, psetting, e);\n";
						packCode += "}\n";
						packCode += "for(; i < fixedLen; i++) {\n";//真实元素个数小于固定长度
						packCode += "	var e = " + type.defaultValue + ";\n";
						packCode += "	(" + type.pack + ").call(e, ctx, psetting, e);\n";
						packCode += "}\n";
					}
					else //可变大小
					{
						packCode += "var vlen = v.length;\n";
						packCode += "ctx.dv.setUint32(ctx.offset, vlen, psetting.littleEndian); ctx.offset += 4;\n";
						packCode += "for(var i = 0; i < vlen; i++) {\n";
						packCode += "	var e = v[i];\n";
						packCode += "	(" + type.pack + ").call(e, ctx, psetting, e);\n";
						packCode += "}\n";
					}

					return {
						name: name,
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue : new Array(0),
						size: new Function("psetting", "v", sizeCode),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('new Array(0)') + packCode),
					};
				}
			},
			
			/** 定义集合的成员
			*
			* 值类型是Set
			* set
			* @param name 属性名。
			* @param type key的结构名。
			*/
			_set: {
				value: function(name, type) {
					var unpackCode = "var len = ctx.dv.getUint32(ctx.offset, psetting.littleEndian); ctx.offset += 4;\n";
					unpackCode += "	var v = new Set();\n";
					unpackCode += "	for(var j = 0; j < len; ++j) {\n";
					unpackCode += "		var av = " + type.unpack + "(ctx, psetting);\n";
					unpackCode += "		v.add(av);\n";
					unpackCode += "	}\n";

					var sizeCode = "var ret = 4;\n";
					sizeCode += "for (let item of v.keys())\n";
					sizeCode += "	ret += " + type.size + "(psetting, item);\n";
					sizeCode += "return ret;\n";

					var packCode = "ctx.dv.setUint32(ctx.offset, v.size, psetting.littleEndian); ctx.offset += 4;\n";
					packCode += "for(let item of v.keys())\n";
					packCode += "	(" + type.pack + ").call(item, ctx, psetting, item);\n";
					return {
						name: name,
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: new Set(),
						size: new Function("psetting", "v", sizeCode),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('new Set()') + packCode),
					};
				}
			},

			/** 定义字典的成员
			*
			* 值类型是Map
			* map
			* @param name 属性名。
			* @param type key的结构名。
			* @param type2 value的结构名。
			*/
			_map: {
				value: function(name, type, type2) {
					var unpackCode = "var len = ctx.dv.getUint32(ctx.offset, psetting.littleEndian); ctx.offset += 4;\n";
					unpackCode += "	var v = new Map();\n";
					unpackCode += "	for(var j = 0; j < len; ++j) {\n";
					unpackCode += "		var ak = " + type.unpack + "(ctx, psetting);\n";
					unpackCode += "		var av = " + type2.unpack + "(ctx, psetting);\n";
					unpackCode += "		v.set(ak, av);\n";
					unpackCode += "	}\n";

					var sizeCode = "var ret = 4;\n";
					sizeCode += "for(var [key, value] of v){\n";
					sizeCode += "	ret += " + type.size + "(psetting, key);\n";
					sizeCode += "	ret += " + type2.size + "(psetting, value);\n";
					sizeCode += "}\n";
					sizeCode += "return ret;\n";

					var packCode = "ctx.dv.setUint32(ctx.offset, v.size, psetting.littleEndian); ctx.offset += 4;\n";
					packCode += "for(var [key, value] of v){\n";
					packCode += "	(" + type.pack + ").call(key, ctx, psetting, key);\n";
					packCode += "	(" + type2.pack + ").call(value, ctx, psetting, value);\n";
					packCode += "}\n";

					return {
						name: name,
						unpack : new Function("ctx", "psetting", "vname", unpackCode + returnValue),
						defaultValue: new Map(),
						size: new Function("psetting", "v", sizeCode),
						pack : new Function("ctx", "psetting", "v", initValue4Undefined('new Map()') + packCode),
					};
				}
			},

			/// 定义结构的成员
			_struct: {
				value: function(name, structType) {
					return {
						name: name,
						unpack: structType.unpack,
						defaultValue: structType.new(),
						size : structType.size,
						pack : structType.pack,
					};
				}
			},
			/// 定义枚举的成员
			_enum: {
				value: function(name, enumType) {
					return {
						name: name,
						unpack: enumType.unpack,
						defaultValue: enumType.defaultValue,
						size : enumType.size,
						pack : enumType.pack,
					};
				}
			},
			
			/// 定义成员，跳过若干字节
			_skip: {
				value: function(length) {
					return {
						name: null,
						unpack: new Function("ctx", "psetting", "vname", "ctx.offset += " + length + ";"),
						size: new Function("psetting", "v", "return " + length + ";"),
						pack: new Function("ctx", "psetting", "v", "ctx.offset += " + length + ";"),
					};
				}
			},
			
			//创建结构类型
			createStruct: {
				value: function() {
					var struct = Object.create(Object.prototype);
					Object.defineProperty(struct, "struct_type_id", { value: "struct_id_" + nextId++});
					Object.defineProperty(this, struct.struct_type_id, { value: struct });
					Object.defineProperty(struct, "new", { value: new Function("return Object.create(BmtStruct." + struct.struct_type_id + "); ")});

					var unpackCode = "var v = Object.create(BmtStruct." + struct.struct_type_id + ");\n";
					var sizeCode = "var ret = 0;\n";
					sizeCode += "if(v === null) v = Object.create(BmtStruct." + struct.struct_type_id + ");\n";
					var packCode = "if(v === null) v = Object.create(BmtStruct." + struct.struct_type_id + ");\n";
					for(var i = 0; i < arguments.length; i++) {
						var type = arguments[i];
						if(type.name)
							Object.defineProperty(struct, type.name, { value: type.defaultValue, enumerable: true, writable: true });
						unpackCode += "(" + type.unpack + ").call(v, ctx, psetting, '" + type.name + "');\n";
						sizeCode += "ret += " + type.size + "(psetting, v." + type.name + ");\n";
						packCode += "	(" + type.pack + ").call(this, ctx, psetting, v." + type.name + ");\n";
					}
					sizeCode += "return ret;\n";
					Object.defineProperty(struct, "unpack", { value: new Function("ctx", "psetting", "vname", unpackCode + returnValue) } );
					Object.defineProperty(struct, "size", { value: new Function("psetting", "v", sizeCode) } );
					Object.defineProperty(struct, "pack", { value: new Function("ctx", "psetting", "v", initValue4Undefined('null') + packCode) } );
					Object.defineProperty(struct, "defaultValue", { value: null } );
					
					return struct;
				}
			},
			
			//创建枚举类型
			createEnum: {
				value: function() {
					if(arguments.length != 1 || typeof arguments[0] !== 'object')
						throw new Error('enum parameter values object must be a object type.');

					var enum_ = Object.create(Object.prototype);
					var emap = new Map();
					var isFirst = true;
					var firstValue;
					for (var e of Object.entries(arguments[0]))
					{
						if(emap.has(e[1]))
							throw "enum value duplicated";
						emap.set(e[1], e[0]);
						Object.defineProperty(enum_, e[0], { value: e[1], enumerable: true, writable: false , configurable: false}); 
						if(isFirst)
						{
							isFirst = false;							
							Object.defineProperty(enum_, "defaultValue", { value: e[1], enumerable: true, writable: false, configurable: false });
							firstValue = e[1];
						}
					}
					Object.defineProperty(enum_, "enum_type_id", { value: "enum_id_" + nextId++});
					Object.defineProperty(enum_, "values_", { value: emap, enumerable: false, writable: false, configurable: false});
					Object.defineProperty(this, enum_.enum_type_id, { value: enum_ });
					Object.defineProperty(enum_, "new", { value: new Function("return Object.create(BmtStruct." + enum_.enum_type_id + "); ")});

					var unpackCode = "var v = ctx.dv.getInt32(ctx.offset, psetting.littleEndian);\n";
					unpackCode += "if(!BmtStruct." + enum_.enum_type_id + ".values_.has(v))\n";
					unpackCode += "	throw 'invalid enum value for unpack()';\n";
					unpackCode += "ctx.offset += 4;\n";
					
					var packCode = "if(!BmtStruct." + enum_.enum_type_id + ".values_.has(v))\n";
					packCode += "	throw 'invalid enum value for pack()';\n";
					packCode += "ctx.dv.setInt32(ctx.offset, v, psetting.littleEndian), ctx.offset += 4;\n";
					Object.defineProperty(enum_, "unpack", { value: new Function("ctx", "psetting", "vname", unpackCode + returnValue) } );
					Object.defineProperty(enum_, "size", { value: new Function("psetting", "v", "return 4;") } );
					Object.defineProperty(enum_, "pack", { value: new Function("ctx", "psetting", "v", initValue4Undefined(firstValue.toString()) + packCode) } );
					
					return enum_;
				}
			},
		});
		
		//简单类型
		BmtStruct.SimpleType = {
			_bool : BmtStruct._bool(),
			_INT8 : BmtStruct._INT8(),
			_INT16 : BmtStruct._INT16(),
			_INT32 : BmtStruct._INT32(),
			_INT64 : BmtStruct._INT64(),
			_float : BmtStruct._float(),
			_double : BmtStruct._double(),
			_char : BmtStruct._char(),
			_ustring : BmtStruct._string('', 'unicode'),
			_astring : BmtStruct._string('', 'ansi'),
			_utf8string : BmtStruct._string('', 'utf8'),
			_LTMSEL : BmtStruct._LTMSEL(),
			_uint8array : BmtStruct._uint8array(),
		};
		//打包及解包的context
		//arg1的类型可以是 ArrayBuffer或DataView
		BmtStruct.Context = function(arg1, offset)
		{
			this.offset = offset || 0; 
			if(arg1 instanceof ArrayBuffer)
				this.dv = new DataView(arg1, this.offset);
			else if(arg1 instanceof DataView)
				this.dv = arg1;
			else
				throw new Error("wrong context argument");
		}
		BmtStruct.Context.prototype.Left = function()
		{
			return this.dv.byteLength - this.offset;
		}
		//64位整数，使用Int64.js中的Int64来表示64位整数
		BmtStruct.Int64 = function()
		{
			if(arguments.length == 1)
				return new Int64_(arguments[0]);
			if(arguments.length == 2)
				return new Int64_(arguments[0], arguments[1]);
			throw new Error("Invalid arguments");
		}
		
		//时间对象，将8字节整数转成Date的对象
		BmtStruct.LTMSEL = function()
		{
			if(arguments.length == 1)
				return new Date(arguments[0]);
			if(arguments.length == 2)
				return new Date(arguments[0], arguments[1]);
			throw new Error("Invalid arguments");
		}
		
		//异常指示的对象，valid参数表示异常是否有效，ex参数表示在异常有效时，具体的异常内容
		BmtStruct.ExHolder = function(valid, ex)
		{
			this.valid = valid;
			if(this.valid)
				this.ex = ex;
		}
	
		BmtStruct.ConstMap = ConstMap_;
		BmtStruct.md5 = md5_;
		BmtStruct.toInt32 = function(v)
		{
			if(v < 80000000)
				return v;
			return v - 0x100000000;
		}
		window.BmtStruct = BmtStruct;
	}
);
