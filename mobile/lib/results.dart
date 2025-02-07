sealed class Result<T, E> {}

final class Ok<T, E> implements Result<T, E> {
  final T value;

  const Ok(this.value);
}

final class Err<T, E> implements Result<T, E> {
  final E value;

  const Err(this.value);
}
