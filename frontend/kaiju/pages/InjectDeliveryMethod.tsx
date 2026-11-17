import ChatIcon from '@mui/icons-material/Chat'
import EmailIcon from '@mui/icons-material/Email'
import NoteIcon from '@mui/icons-material/Note'
import PhoneIcon from '@mui/icons-material/Phone'

export type DeliveryMethod = 'index_card' | 'phone_call' | 'email' | 'chat_message'

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  index_card: 'Index card',
  phone_call: 'Phone call',
  email: 'Email',
  chat_message: 'Chat message',
}

const icons = {
  index_card: NoteIcon,
  phone_call: PhoneIcon,
  email: EmailIcon,
  chat_message: ChatIcon,
}

export function InjectDeliveryMethod({ method }: { method: DeliveryMethod }) {
  const Icon = icons[method]
  if (!Icon) return null
  return <Icon fontSize="small" role="img" aria-label={deliveryMethodLabels[method]} />
}
