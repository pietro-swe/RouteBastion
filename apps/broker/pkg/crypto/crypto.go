package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"

	"github.com/google/uuid"
)

type HashComparer interface {
	Compare(hash string, plain string) (bool, error)
}

type HashGenerator interface {
	Generate(plain string) (string, error)
}

type APIKeyComparer struct {
	secret []byte
}

func NewHashComparer(secret []byte) HashComparer {
	return &APIKeyComparer{
		secret: secret,
	}
}

func (c *APIKeyComparer) Compare(hash string, plain string) (bool, error) {
	data, err := base64.URLEncoding.DecodeString(hash)
	if err != nil {
		return false, fmt.Errorf("error decoding base64: %w", err)
	}

	block, err := aes.NewCipher(c.secret)
	if err != nil {
		return false, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return false, err
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return false, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]

	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return false, fmt.Errorf("error decrypting: %w", err)
	}

	return string(plaintext) == plain, nil
}

type APIKeyGenerator struct {
	secret []byte
}

func NewHashGenerator(secret []byte) HashGenerator {
	return &APIKeyGenerator{
		secret: secret,
	}
}

func (u *APIKeyGenerator) Generate(plain string) (string, error) {
	_, err := uuid.Parse(plain)
	if err != nil {
		return "", fmt.Errorf("invalid uuid provided: %w", err)
	}

	block, err := aes.NewCipher(u.secret)
	if err != nil {
		return "", fmt.Errorf("error creating cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("error creating GCM: %w", err)
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("error generating nonce: %w", err)
	}

	ciphertext := aesGCM.Seal(nil, nonce, []byte(plain), nil)

	encryptedWithNonce := append(nonce, ciphertext...)
	encoded := base64.URLEncoding.EncodeToString(encryptedWithNonce)

	return encoded, nil
}
