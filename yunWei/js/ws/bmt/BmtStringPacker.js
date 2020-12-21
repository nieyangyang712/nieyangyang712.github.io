"use strict";
define(
	[
		"./ConstMap",
	],
	function(ConstMap){
		//根据buffSize返回剩余空间大小，-1表示变长
		var BuffLeft = function(ctx, buffSize)
		{
			ctx.fixedSize = true;
			if(buffSize > 0) //定长
				return buffSize; //返回该长度
			
			ctx.offsetOld = ctx.offset; //记录当前偏移
			ctx.offset += 4; //偏移加4
			ctx.fixedSize = false;
			return Number.MAX_SAFE_INTEGER; //无限大
		}
		var	StringPackLastStep = function(ctx, buffLeft, psetting)
		{
			if(ctx.fixedSize)
			{
				if(buffLeft > 0)//定长字符串，存放完所有字符，还有空余空间
				{
					//存放'\0'字符到缓冲区末尾，并返回
					new Uint8Array(ctx.dv.buffer, ctx.offset, buffLeft).fill(0);
					ctx.offset += buffLeft;
					return;
				}
			}
			else //下面处理变长字符串的长度
				ctx.dv.setUint32(ctx.offsetOld, ctx.offset - ctx.offsetOld - 4, psetting.littleEndian);
		}
		
		var StringUnpackFirstStep = function(ctx, buffSize, psetting)
		{
			ctx.bytes = buffSize;
			ctx.fixedSize = true;
			if(0 == ctx.bytes)
			{
				ctx.bytes = ctx.dv.getInt32(ctx.offset, psetting.littleEndian); 
				ctx.offset += 4;
				if(ctx.bytes <= 0)
					return false; //空字符串
				ctx.fixedSize = false;
			}
			ctx.strBuff = new Uint16Array(ctx.bytes);
			ctx.k = 0;
			return true;
		}
		var StringUnpackLastStep = function(ctx)
		{
			ctx.offset += ctx.bytes;
			return String.fromCharCode.apply(null, ctx.strBuff.slice(0, ctx.k));
		}
		//根据字节值，获取字节的类型及携带值，-1表示结束，0表示6位携带，1表示1字节，2表示2字节，3表示3字节
		var GetUtf8Char = function(c)
		{
			var ret = {};
			if(c >> 7 == 0b0)
			{
				if(c == 0)
				{
					ret.t = -1; //’\0'结束符
					ret.v = 0;
				}
				else
				{
					ret.t = 1; //1字节
					ret.v = c;
				}
			}
			else if(c >> 6 == 0b10)
			{
				ret.t = 0; //6位值
				ret.v = c & 0b111111;
			}
			else if(c >> 5 == 0b110)
			{
				ret.t = 2; //2字节
				ret.v = c & 0b11111;
			}
			else if(c >> 4 == 0b1110)
			{
				ret.t = 3; //3字节
				ret.v = c & 0b1111;
			}
			else
				throw new Error('不支持的utf8字节码 ' + c);

			return ret;
		}
		// @buffSize为0表示不定长字符串，实际长度在缓冲区头部指明

		var BmtStringPacker = function(code, psetting)
		{
			if(code == 'follow')
			{
				console.assert(psetting.code == 'ansi' || psetting.code == 'unicode' || psetting.code == 'utf8', '必须是三种类型之一');
				code = psetting.code;
			}
			var function_set = 
			{
				ansi : { 
					pack : function (ctx, psetting, buffSize, v)
					{
						var buffLeft = BuffLeft(ctx, buffSize);

						for(let i = 0; i < v.length; i++) 
						{
							var c = v.charCodeAt(i);
							var ch = BmtStruct.ConstMap.u2a[c];
							if(ch < 128) 
							{
								if(buffLeft >= 1) //有空间
								{
									ctx.dv.setUint8(ctx.offset++, ch);
									buffLeft--;
								}
								else //定长无空间
								{
									//否则，不操作，保留最后的字符
									return;
								}
							}
							else
							{
								if(buffLeft >= 2) //有空间
								{
									ctx.dv.setInt16(ctx.offset, ch, psetting.littleEndian); 
									ctx.offset += 2;
									buffLeft -= 2;
								}
								else //定长无空间
								{
									if(buffLeft == 1) //还有1字节空间
										ctx.dv.setUint8(ctx.offset++, 0);
									return;
								}
							}
						}
						
						StringPackLastStep(ctx, buffLeft, psetting);
					}, 
					unpack : function (ctx, psetting, buffSize)
					{
						if(!StringUnpackFirstStep(ctx, buffSize, psetting))
							return '';

						var offset = ctx.offset;
						for(let i = 0; i < ctx.bytes; i++, offset++) 
						{
							var ch = ctx.dv.getUint8(offset);
							if(ch === 0 && ctx.fixedSize) //定长字符串，遇到'\0'，字符串结束
								break; //跳出
							if(ch < 128) //单字节字符
								ctx.strBuff[ctx.k++] = ch;
							else //双字符字符
							{
								if(ctx.fixedSize && (i+1 >= ctx.bytes)) //定长，读了一个汉字的高字节，但是低字节已经超出缓冲区
									break; //跳出
								var c = ctx.dv.getUint16(offset++, psetting.littleEndian);
								ctx.strBuff[ctx.k++] = ConstMap.a2u[c];
								i++;
							}
						}
						
						return StringUnpackLastStep(ctx);
					}, 
					vsize : function (v) 
					{
						var ret = 4;
						for(var i = 0; i < v.length; i++) 
						{
							ret++;
							if(v.charCodeAt(i) >= 128)
								ret++;
						}
						return ret;
					},
				},
				unicode : { 
					pack : function (ctx, psetting, buffSize, v)
					{
						var buffLeft = BuffLeft(ctx, buffSize);
						for(let i = 0; i < v.length; i++) 
						{
							var c = v.charCodeAt(i);
							if(buffLeft >= 2) //有空间
							{
								ctx.dv.setInt16(ctx.offset, c, psetting.littleEndian); 
								ctx.offset += 2;
								buffLeft -= 2;
							}
							else //定长无空间
								break;
						}
						StringPackLastStep(ctx, buffLeft, psetting);
					}, 
					unpack : function (ctx, psetting, buffSize)
					{
						if(!StringUnpackFirstStep(ctx, buffSize, psetting))
							return '';

						var iEnd = Math.floor(ctx.bytes / 2);
						var offset = ctx.offset;
						for(let i = 0; i < iEnd; i++, offset += 2) 
						{
							var ch = ctx.dv.getUint16(offset, psetting.littleEndian);
							if(ch === 0 && ctx.fixedSize) //定长字符串，遇到'\0'，字符串结束
								break; //跳出
							ctx.strBuff[ctx.k++] = ch;
						}
						
						return StringUnpackLastStep(ctx);
					}, 
					vsize : function (v) 
					{
						return v.length * 2 + 4;
					},
				},
				utf8 : { 
					pack : function (ctx, psetting, buffSize, v)
					{
						var buffLeft = BuffLeft(ctx, buffSize);

						for(let i = 0; i < v.length; i++) 
						{
							var c = v.charCodeAt(i);
							var ch = [];
							if(c <= 0x7f) //单字节
								ch.push(c);
							else
							{
								ch.push((c & 0x3f) | 0b10000000); c >>= 6; //最低字节
								if(c <= 0x1f) //双字节
									ch.push((c & 0x1f) | 0b11000000); //高字节
								else
								{
									ch.push((c & 0x3f) | 0b10000000); c >>= 6; //中间字节
									ch.push((c & 0x0f) | 0b11100000); //高字节
								}
							}
							if(psetting.littleEndian && ch.length > 1) //小端机且长度大于1
								ch.reverse(); //反序，这样高字节在后面
							if(buffLeft >= ch.length) //剩余的空间能容纳当前字符
							{
								buffLeft -= ch.length;
								while(ch.length > 0)
									ctx.dv.setUint8(ctx.offset++, ch.pop()); //高字节先写
							}
							else //定长字符串，但是已经不能存放当前字符
							{
								//存放'\0'字符到缓冲区末尾，并返回
								new Uint8Array(ctx.dv.buffer, ctx.offset, buffLeft).fill(0);
								ctx.offset += buffLeft;
								return;
							}
						}
						StringPackLastStep(ctx, buffLeft, psetting);
					}, 
					unpack : function (ctx, psetting, buffSize)
					{
						if(!StringUnpackFirstStep(ctx, buffSize, psetting))
							return '';
						
						var lCodes = [];
						var offset = ctx.offset;
						for(let i = 0; i < ctx.bytes; i++, offset++)
						{
							var m = GetUtf8Char(ctx.dv.getUint8(offset));
							
							if(m.t == 1) //单字节
								ctx.strBuff[ctx.k++] = m.v; //直接加到strBuff中
							else if(m.t >= 0)
							{
								if(psetting.littleEndian) //小端机
								{
									lCodes.push(m.v); //加到lCodes中
									if(m.t != 0) //不为0，表示遇到高位字节
									{
										//根据lCodes中的内容构造v
										var v = 0;
										while(lCodes.length > 0)
										{
											v <<= 6;
											v += lCodes.pop();
										}
										ctx.strBuff[ctx.k++] = v; //v加到strBuff中
									}
								}
								else //大端机
								{
									var v = m.v << 6; //先保存高字节
									if(i + 1 >= ctx.bytes)//超过定长的缓冲区
										break;
									var m2 = GetUtf8Char(ctx.dv.getUint8(++offset)); //取第二字节到m2
									v += m2.v; //累加第二字节的值到v
									i++;
									if(m.t == 3) //有3个字节
									{
										v <<= 6; 
										if(i + 1 >= ctx.bytes)//超过定长的缓冲区
											break;
										var m3 = GetUtf8Char(ctx.dv.getUint8(++offset)); //取第三字节的值
										v += m3.v; //累加到v
										i++;
									}
									ctx.strBuff[ctx.k++] = v; //v加到strBuff中
								}
							}
							else //小于0，是遇到了'\0'
							{	
								if(ctx.fixedSize)
									break; //跳出循环
								else
									throw new Error('变长Utf-8字符串出错，其中出现Zero字符');
							}
						}
						
						return StringUnpackLastStep(ctx);
					}, 
					vsize : function (v) 
					{
						var ret = 4;
						for(let i = 0; i < v.length; i++)
						{
							var c = v.charCodeAt(i)
							if(c <= 0x7f)
								ret += 1;
							else if(c <= 0x7ff)
								ret += 2;
							else if(c <= 0xffff)
								ret += 3;
							else
								throw new Error('不支持的Unicode码 ' + c);
						}
						return ret;
					},
				},
			}
			return function_set[code];
		}
		window.BmtStringPacker = BmtStringPacker; //这样在BmtStruct中可以直接使用BmtStringPacker
		return BmtStringPacker;
	}
);
