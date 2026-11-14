import Box, { type BoxProps } from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import { forwardRef } from 'react'

export const DEATHLABS_CLASSIFICATION_BANNER_HEIGHT = 23

export enum DeathlabsClassification {
  UNCLASSIFIED = 'Unclassified',
  CUI = 'CUI',
  CONFIDENTIAL = 'Confidential',
  SECRET = 'Secret',
  TOP_SECRET = 'Top Secret',
  TOP_SECRET_SCI = 'Top Secret // SCI',
}

export interface DeathlabsClassificationBannerProps
  extends Omit<BoxProps, 'type'> {
  type: DeathlabsClassification
}

const tokenNames = {
  [DeathlabsClassification.UNCLASSIFIED]: 'unclassified',
  [DeathlabsClassification.CUI]: 'cui',
  [DeathlabsClassification.CONFIDENTIAL]: 'confidential',
  [DeathlabsClassification.SECRET]: 'secret',
  [DeathlabsClassification.TOP_SECRET]: 'topSecret',
  [DeathlabsClassification.TOP_SECRET_SCI]: 'topSecretSci',
} as const

const darkTextClassifications = new Set<DeathlabsClassification>([
  DeathlabsClassification.TOP_SECRET,
  DeathlabsClassification.TOP_SECRET_SCI,
])

export const DeathlabsClassificationBanner = forwardRef<
  HTMLDivElement,
  DeathlabsClassificationBannerProps
>(function DeathlabsClassificationBanner(
  { type, sx, children, ...props },
  ref,
) {
  const theme = useTheme()
  const tokenName = tokenNames[type]

  return (
    <Box
      ref={ref}
      data-testid="classification-banner"
      sx={[
        {
          alignItems: 'center',
          backgroundColor: theme.deathlabs.colors.classification[tokenName],
          color: darkTextClassifications.has(type)
            ? theme.palette.common.black
            : theme.palette.common.white,
          display: 'flex',
          fontWeight: 500,
          height: DEATHLABS_CLASSIFICATION_BANNER_HEIGHT,
          justifyContent: 'center',
          left: 0,
          position: 'fixed',
          right: 0,
          top: 0,
          zIndex: theme.zIndex.tooltip + 1,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {children ?? type.toUpperCase()}
    </Box>
  )
})

DeathlabsClassificationBanner.displayName = 'DeathlabsClassificationBanner'
