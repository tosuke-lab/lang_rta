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

// hogeで成功するパーサ
const hogeParser: Parser<string> = src =>
  src.startsWith("hoge")
    ? parseSuccess("hoge", 4)
    : parseFailure([`expect 'hoge', but got '${src.slice(0, 4)}'`]);

console.log(hogeParser("hogepoyo")); // => Success!
console.log(hogeParser("foobar")); // => Failure
