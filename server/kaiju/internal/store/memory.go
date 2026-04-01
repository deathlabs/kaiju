/*
Copyright © 2026 Vic Fernandez III <@cyberphor>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
package store

import (
	"errors"
	"sync"
)

type MemoryStore[Type any] struct {
	mu    sync.RWMutex
	items map[string]*Type
}

func NewMemoryStore[Type any]() *MemoryStore[Type] {
	return &MemoryStore[Type]{items: make(map[string]*Type)}
}

func (s *MemoryStore[Type]) Save(item *Type) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	// need a way to get the ID from item
	return nil
}

func (s *MemoryStore[Type]) Get(id string) (*Type, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.items[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return item, nil
}

func (s *MemoryStore[Type]) List() ([]*Type, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := make([]*Type, 0, len(s.items))
	for _, item := range s.items {
		items = append(items, item)
	}
	return items, nil
}
