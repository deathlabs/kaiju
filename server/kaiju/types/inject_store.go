package types

type InjectStore interface {
	Save(inject *Inject) error
	Get(id string) (*Inject, error)
	List() ([]*Inject, error)
}
