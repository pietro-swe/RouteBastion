package customerrors

import (
	"errors"
	"fmt"
	"net/http"
)

type ErrorCode string

const (
	ErrCodeInvalidData       ErrorCode = "INVALID_DATA"
	ErrCodeInvalidInput      ErrorCode = "INVALID_INPUT"
	ErrCodeNotFound          ErrorCode = "NOT_FOUND"
	ErrCodeConflict          ErrorCode = "CONFLICT"
	ErrCodeEncryptionFailure ErrorCode = "ENCRYPTION_FAILURE"
	ErrCodeDatabaseFailure   ErrorCode = "DATABASE_FAILURE"
	ErrCodeUnauthorized      ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden         ErrorCode = "FORBIDDEN"
	ErrUnknown               ErrorCode = "UNKNOWN_ERROR"
)

type ErrorLayer string

const (
	LayerDomain         ErrorLayer = "domain"
	LayerApplication    ErrorLayer = "application"
	LayerInfrastructure ErrorLayer = "infrastructure"
)

type AppError struct {
	Code  ErrorCode
	Layer ErrorLayer
	Msg   string
	Err   error // wrapped error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %s: %v", e.Layer, e.Code, e.Msg, e.Err)
	}
	return fmt.Sprintf("[%s] %s: %s", e.Layer, e.Code, e.Msg)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// Constructor functions for each layer
func NewDomainError(code ErrorCode, msg string, err error) *AppError {
	return &AppError{Code: code, Layer: LayerDomain, Msg: msg, Err: err}
}

func NewApplicationError(code ErrorCode, msg string, err error) *AppError {
	return &AppError{Code: code, Layer: LayerApplication, Msg: msg, Err: err}
}

func NewInfrastructureError(code ErrorCode, msg string, err error) *AppError {
	return &AppError{Code: code, Layer: LayerInfrastructure, Msg: msg, Err: err}
}

// Helper to check error codes
func IsCode(err error, code ErrorCode) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code == code
	}
	return false
}

func ToHttpStatus(err error) int {
	var appErr *AppError
	if errors.As(err, &appErr) {
		switch appErr.Code {
		case ErrCodeInvalidInput:
			return http.StatusBadRequest
		case ErrCodeUnauthorized:
			return http.StatusUnauthorized
		case ErrCodeForbidden:
			return http.StatusForbidden
		case ErrCodeNotFound:
			return http.StatusNotFound
		case ErrCodeConflict:
			return http.StatusConflict
		case ErrCodeEncryptionFailure, ErrCodeDatabaseFailure, ErrCodeInvalidData:
			return http.StatusInternalServerError
		default:
			return http.StatusInternalServerError
		}
	}

	return http.StatusInternalServerError
}
