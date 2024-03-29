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

// パーサを繋ぐ
function seq<A>(p1: Parser<A>): Parser<[A]>;
function seq<A, B>(p1: Parser<A>, p2: Parser<B>): Parser<[A, B]>;
function seq<A, B, C>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>
): Parser<[A, B, C]>;
function seq<A, B, C, D>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>
): Parser<[A, B, C, D]>;
function seq<A, B, C, D, E>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>,
  p5: Parser<E>
): Parser<[A, B, C, D, E]>;
function seq<A, B, C, D, E, F>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>,
  p5: Parser<E>,
  p6: Parser<F>
): Parser<[A, B, C, D, E, F]>;
function seq<A, B, C, D, E, F, G>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>,
  p5: Parser<E>,
  p6: Parser<F>,
  p7: Parser<G>
): Parser<[A, B, C, D, E, F, G]>;
function seq<A, B, C, D, E, F, G, H>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>,
  p5: Parser<E>,
  p6: Parser<F>,
  p7: Parser<G>,
  p8: Parser<H>
): Parser<[A, B, C, D, E, F, G, H]>;
function seq<A, B, C, D, E, F, G, H, I>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>,
  p5: Parser<E>,
  p6: Parser<F>,
  p7: Parser<G>,
  p8: Parser<H>,
  p9: Parser<I>
): Parser<[A, B, C, D, E, F, G, H, I]>;
function seq(...parsers: Parser<unknown>[]): Parser<any[]> {
  return new Parser(src => {
    const result: unknown[] = [];
    let consumed = 0;
    for (const parser of parsers) {
      const r = parser.parse(src.slice(consumed));
      if (r.type === "failure") return r;
      consumed += r.consumed;
      result.push(r.result);
    }
    return parseSuccess(result, consumed);
  });
}

// パーサを並べて、最初に成功したものを返す
const or = <A>(...parsers: Parser<A>[]) =>
  new Parser<A>(src => {
    const reasons: string[] = [];
    for (const parser of parsers) {
      const r = parser.parse(src);
      if (r.type === "success") return r;
      reasons.push(...r.reasons);
    }
    return parseFailure(reasons);
  });

// パーサを連続して適用する
const many = <A>(parser: Parser<A>) =>
  new Parser<A[]>(src => {
    const result: A[] = [];
    let consumed = 0;
    while (true) {
      const r = parser.parse(src.slice(consumed));
      if (r.type === "failure") return parseSuccess(result, consumed);
      result.push(r.result);
      consumed += r.consumed;
    }
  });

// 遅延させる
const lazy = <A>(parser: () => Parser<A>) =>
  new Parser<A>(src => parser().parse(src));

class Literal {
  constructor(readonly value: number) {}
}

class Add {
  constructor(readonly lhs: Expr, readonly rhs: Expr) {}
}

class Sub {
  constructor(readonly lhs: Expr, readonly rhs: Expr) {}
}

class Mul {
  constructor(readonly lhs: Expr, readonly rhs: Expr) {}
}

class Div {
  constructor(readonly lhs: Expr, readonly rhs: Expr) {}
}

type Expr = Literal | Add | Sub | Mul | Div;

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
}).map(x => new Literal(parseInt(x, 10)) as Expr);

// スペースのパーサ
const spaceRegex = /^\s*/;
const spaceParser = new Parser<string>(src => {
  const match = spaceRegex.exec(src);
  if (match) {
    return parseSuccess(match[0], match[0].length);
  }
  throw "unreachable!";
});

// 括弧
function primeParser() {
  return or(
    numParser,
    seq(
      constParser("("),
      spaceParser,
      lazy(exprParser),
      spaceParser,
      constParser(")")
    ).map(([, , expr]) => expr)
  );
}

// かけ算と割り算を処理するパーサ
function mulDivParser() {
  return seq(
    primeParser(),
    many(
      seq(
        spaceParser,
        or(constParser("*"), constParser("/")),
        spaceParser,
        primeParser()
      ).map(([, op, , expr]) => [op, expr] as const)
    )
  ).map(([expr, ops]) =>
    ops.reduce(
      (pre, op) => (op[0] === "*" ? new Mul(pre, op[1]) : new Div(pre, op[1])),
      expr as Expr
    )
  );
}

// 足し算と引き算を処理するパーサ
function plusMinusParser() {
  return seq(
    mulDivParser(),
    many(
      seq(
        spaceParser,
        or(constParser("+"), constParser("-")),
        spaceParser,
        mulDivParser()
      ).map(
        ([, op, , expr]) =>
          [op === "+" ? ("+" as const) : ("-" as const), expr] as const
      )
    )
  ).map(([num, ops]) =>
    ops.reduce(
      (pre, op) => (op[0] === "+" ? new Add(pre, op[1]) : new Sub(pre, op[1])),
      num as Expr
    )
  );
}

function exprParser(): Parser<Expr> {
  return plusMinusParser();
}

const evaluate = (ast: Expr): number => {
  if (ast instanceof Literal) {
    return ast.value;
  } else if (ast instanceof Add) {
    return evaluate(ast.lhs) + evaluate(ast.rhs);
  } else if (ast instanceof Sub) {
    return evaluate(ast.lhs) - evaluate(ast.rhs);
  } else if (ast instanceof Mul) {
    return evaluate(ast.lhs) * evaluate(ast.rhs);
  } else if (ast instanceof Div) {
    return evaluate(ast.lhs) / evaluate(ast.rhs);
  } else {
    const _exhaustiveCheck: never = ast;
    throw "unreached";
  }
};

const run = (src: string) => {
  const r = exprParser().parse(src);
  if (r.type === "failure") {
    console.error(r.reasons);
    return;
  }
  const ast = r.result;
  console.log(evaluate(ast));
};

run("1 + 2 * 3 + 4");
run("(1+2)*(3*4)");
