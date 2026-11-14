import Box, { type BoxProps } from '@mui/material/Box'
import { forwardRef } from 'react'

export type DeathlabsPageContentProps = BoxProps

export const DeathlabsPageContent = forwardRef<
  HTMLDivElement,
  DeathlabsPageContentProps
>(function DeathlabsPageContent({ children, sx, ...props }, ref) {
  return (
    <Box
      ref={ref}
      sx={[
        {
          boxSizing: 'border-box',
          minWidth: 0,
          p: { xs: 2, sm: 3 },
          textAlign: 'left',
          width: '100%',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {children}
    </Box>
  )
})

DeathlabsPageContent.displayName = 'DeathlabsPageContent'
