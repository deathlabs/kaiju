package types

import (
	"errors"
	"sync"
)

type MemoryStore struct {
	mu      sync.RWMutex
	injects map[string]*Inject
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{injects: make(map[string]*Inject)}
}

func (store *MemoryStore) Save(inject *Inject) error {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.injects[inject.ID] = inject

	return nil
}

func (store *MemoryStore) Get(id string) (*Inject, error) {
	var (
		inject *Inject
		ok     bool
	)

	store.mu.RLock()
	defer store.mu.RUnlock()

	inject, ok = store.injects[id]
	if !ok {
		return nil, errors.New("inject not found")
	}

	return inject, nil
}

func (store *MemoryStore) List() ([]*Inject, error) {
	var (
		inject  *Inject
		injects []*Inject
	)

	store.mu.RLock()
	defer store.mu.RUnlock()

	injects = make([]*Inject, 0, len(store.injects))
	for _, inject = range store.injects {
		injects = append(injects, inject)
	}

	return injects, nil
}
