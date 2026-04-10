package mail

import (
	"fmt"
	"net/smtp"
	"strings"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

type Sender struct {
	cfg Config
}

func NewSender(cfg Config) *Sender {
	return &Sender{cfg: cfg}
}

func (s *Sender) Configured() bool {
	return s.cfg.Host != "" && s.cfg.User != "" && s.cfg.Password != "" && s.cfg.From != ""
}

func (s *Sender) Send(to []string, subject, body string) error {
	if !s.Configured() {
		return fmt.Errorf("mail not configured")
	}
	addr := fmt.Sprintf("%s:%s", s.cfg.Host, s.cfg.Port)
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Password, s.cfg.Host)
	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n",
		s.cfg.From, strings.Join(to, ", "), subject, body))
	return smtp.SendMail(addr, auth, s.cfg.From, to, msg)
}
