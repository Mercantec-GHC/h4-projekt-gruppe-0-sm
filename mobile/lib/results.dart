sealed class Result<T, E> {
  Result<Y, E> map<Y>(Y Function(T value) mapper);
  Result<Y, E> flatMap<Y>(Result<Y, E> Function(T value) mapper);
}

final class Ok<T, E> implements Result<T, E> {
  final T value;

  const Ok(this.value);

  @override
  Result<Y, E> map<Y>(Y Function(T value) mapper) => Ok(mapper(value));
  @override
  Result<Y, E> flatMap<Y>(Result<Y, E> Function(T value) mapper) =>
      mapper(value);
}

final class Err<T, E> implements Result<T, E> {
  final E value;

  const Err(this.value);

  @override
  Result<Y, E> map<Y>(Y Function(T value) mapper) => Err(value);
  @override
  Result<Y, E> flatMap<Y>(Result<Y, E> Function(T value) mapper) => Err(value);
}
