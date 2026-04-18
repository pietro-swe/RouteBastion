package db

import "context"

type TxManager interface {
	WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

func WithinTransactionReturning[T any](
	tm TxManager,
	ctx context.Context,
	fn func(ctx context.Context) (T, error),
) (T, error) {
	var result T

	err := tm.WithinTransaction(ctx, func(txCtx context.Context) error {
		var err error
		result, err = fn(txCtx)
		return err
	})

	return result, err
}
