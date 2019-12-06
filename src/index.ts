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

type Parser<A> = (src: string) => Result<A>;

// 渡された文字列で成功するパーサを返す関数
const constParser = (lit: string): Parser<string> => src =>
  src.startsWith(lit)
    ? parseSuccess(lit, lit.length)
    : parseFailure([`expect 'hoge', but got '${src.slice(0, lit.length)}'`]);

// 数字のパーサ
const numRegex = /^\-?\d+/;
const numParser: Parser<number> = src => {
  const match = numRegex.exec(src);
  if (match) {
    return parseSuccess(parseInt(match[0], 10), match[0].length);
  } else {
    return parseFailure([`expect a number, but got '${src[0]}...'`]);
  }
};

const hogeParser = constParser("hoge");

console.log(hogeParser("hogepoyo")); // => Success!
console.log(hogeParser("foobar")); // => Failure

console.log(numParser("10 "));
console.log(numParser("hoge"));
