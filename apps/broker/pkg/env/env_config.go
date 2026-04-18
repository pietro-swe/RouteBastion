package env

import (
	"encoding/base64"

	"github.com/spf13/viper"
)

type AppEnvConfig struct {
	ServerPort string `mapstructure:"SERVER_PORT"`

	OtelEndpoint string `mapstructure:"OTEL_ENDPOINT"`

	EncryptionKey      string `mapstructure:"ENCRYPTION_KEY"`
	EncryptionKeyBytes []byte

	DBUsername string `mapstructure:"DB_USERNAME"`
	DBPassword string `mapstructure:"DB_PASSWORD"`
	DBHost     string `mapstructure:"DB_HOST"`
	DBPort     string `mapstructure:"DB_PORT"`
	DBDatabase string `mapstructure:"DB_DATABASE"`
	DBSchema   string `mapstructure:"DB_SCHEMA"`
}

func (c *AppEnvConfig) LoadEncryptionKeyBytes() (err error) {
	key, err := base64.StdEncoding.DecodeString(c.EncryptionKey)
	if err != nil {
		return err
	}

	c.EncryptionKeyBytes = key

	return nil
}

func LoadConfig(path string) (config AppEnvConfig, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName("app")
	viper.SetConfigType("env")

	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		return
	}

	err = viper.Unmarshal(&config)
	return
}
