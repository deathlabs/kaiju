import ChatIcon from '@mui/icons-material/Chat'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'

export type DeliveryMethod = 'voicemail' | 'email' | 'chat_message'

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  voicemail: 'Voicemail',
  email: 'Email',
  chat_message: 'Chat message',
}

const icons = {
  voicemail: PhoneIcon,
  email: EmailIcon,
  chat_message: ChatIcon,
}

export function InjectDeliveryMethod({ method }: { method: DeliveryMethod }) {
  const Icon = icons[method]
  if (!Icon) return null
  return <Icon fontSize="small" role="img" aria-label={deliveryMethodLabels[method]} />
}
