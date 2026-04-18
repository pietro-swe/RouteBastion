package dbutils

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type TxKey struct{}

type TxManager interface {
	WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

func WithinTransactionReturning[T any](
	ctx context.Context,
	tm TxManager,
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

func WithinTransactionReturningErr(
	ctx context.Context,
	tm TxManager,
	fn func(ctx context.Context) error,
) error {
	return tm.WithinTransaction(ctx, fn)
}

// ExtractTx is a helper to retrieve the pgx.Tx from the context.
func ExtractTx(ctx context.Context) (pgx.Tx, error) {
	tx, ok := ctx.Value(TxKey{}).(pgx.Tx)

	if !ok {
		return nil, errors.New("transaction not found in context")
	}

	return tx, nil
}

func ConvertPgtypeTimestampToTime(ts pgtype.Timestamp) (time.Time, error) {
	if !ts.Valid {
		return time.Time{}, errors.New("timestamp is not valid")
	}
	return ts.Time, nil
}

func ConvertPgtypeTimestampToTimePointer(ts pgtype.Timestamp) (*time.Time, error) {
	if !ts.Valid {
		return nil, nil
	}
	return &ts.Time, nil
}

func ConvertTimeToPgtypeTimestamp(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{
		Time:  t,
		Valid: true,
	}
}

func ConvertNullableTimeToPgtypeTimestamp(t *time.Time) pgtype.Timestamp {
	if t == nil {
		return pgtype.Timestamp{
			Valid: false,
		}
	}

	return pgtype.Timestamp{
		Time:  *t,
		Valid: true,
	}
}

func IsNoRowsError(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func UUIDToPgtypeUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{
		Bytes: id,
		Valid: true,
	}
}

func PgtypeUUIDToUUID(pgUUID pgtype.UUID) (uuid.UUID, error) {
	if !pgUUID.Valid {
		return uuid.Nil, errors.New("UUID is not valid")
	}
	return pgUUID.Bytes, nil
}
