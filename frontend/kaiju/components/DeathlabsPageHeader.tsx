import Typography, { type TypographyProps } from '@mui/material/Typography'
import { forwardRef } from 'react'

export type DeathlabsPageHeaderProps = Omit<
  TypographyProps,
  'component' | 'variant'
>

export const DeathlabsPageHeader = forwardRef<
  HTMLHeadingElement,
  DeathlabsPageHeaderProps
>(function DeathlabsPageHeader(
  { children, color = 'text.primary', gutterBottom = true, ...props },
  ref,
) {
  return (
    <Typography
      ref={ref}
      color={color}
      component="h1"
      gutterBottom={gutterBottom}
      variant="h4"
      {...props}
    >
      {children}
    </Typography>
  )
})

DeathlabsPageHeader.displayName = 'DeathlabsPageHeader'
