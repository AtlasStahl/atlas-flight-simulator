package examples

import (
  "bufio"
  "net/http"
)

// FlushWriter flushes after each Write.
type FlushWriter struct {
  w http.ResponseWriter
}

func (fw FlushWriter) Write(p []byte) (int, error) {
  n, err := fw.w.Write(p)
  if f, ok := fw.w.(http.Flusher); ok {
    f.Flush()
  }
  return n, err
}

// Optional: wrap with bufio.Writer if you want controlled chunk sizes.
func NewBufferedFlushWriter(w http.ResponseWriter) *bufio.Writer {
  return bufio.NewWriter(FlushWriter{w: w})
}
