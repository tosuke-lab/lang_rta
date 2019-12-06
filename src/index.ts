type Result<A> =
  | { type: "success"; consumed: number; result: A }
  | { type: "failure"; reasons: string[] };

const parseSuccess = <A>(result: A, consumed: number): Result<A> => ({
  type: "success",
  consumed,
  result
});
const parseFailure = <A>(reasons: string[]): Result<A> => ({
  type: "failure",
  reasons
});

class Parser<A> {
  constructor(readonly parse: (src: string) => Result<A>) {}
  map<B>(f: (x: A) => B) {
    return new Parser(src => {
      const r = this.parse(src);
      if (r.type === "success") {
        return parseSuccess(f(r.result), r.consumed);
      } else {
        return r;
      }
    });
  }
}

// 渡された文字列で成功するパーサを返す関数
const constParser = (lit: string): Parser<string> =>
  new Parser(src =>
    src.startsWith(lit)
      ? parseSuccess(lit, lit.length)
      : parseFailure([`expect 'hoge', but got '${src.slice(0, lit.length)}'`])
  );

// 数字のパーサ
const numRegex = /^\-?\d+/;
const numParser = new Parser<string>(src => {
  const match = numRegex.exec(src);
  if (match) {
    return parseSuccess(match[0], match[0].length);
  } else {
    return parseFailure([`expect a number, but got '${src[0]}...'`]);
  }
}).map(x => parseInt(x, 10));

const hogeParser = constParser("hoge");

console.log(hogeParser.parse("hogepoyo")); // => Success!
console.log(hogeParser.parse("foobar")); // => Failure

console.log(numParser.parse("10 "));
console.log(numParser.parse("hoge"));
