import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import { useEffect, useId, useState, type MouseEvent } from 'react'

import type { DeathlabsNavBarItem } from './types'

export interface DeathlabsUserMenuProps {
  items: readonly DeathlabsNavBarItem[]
}

interface CurrentUser {
  username: string
  display_name: string
  email: string
}

export const DeathlabsUserMenu = ({ items }: DeathlabsUserMenuProps) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [userLoadFailed, setUserLoadFailed] = useState(false)
  const id = useId()
  const buttonId = `${id}-button`
  const menuId = `${id}-menu`
  const open = Boolean(anchorElement)

  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/v1/me', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the current user.')
        return response.json() as Promise<CurrentUser>
      })
      .then(setUser)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setUserLoadFailed(true)
        }
      })

    return () => controller.abort()
  }, [])

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorElement(event.currentTarget)
  }

  const closeMenu = () => {
    setAnchorElement(null)
  }

  if (!user && !userLoadFailed) {
    return <Skeleton height={36} sx={{ ml: 1 }} variant="rounded" width={150} />
  }

  return (
    <>
      <Button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="menu"
        color="inherit"
        id={buttonId}
        onClick={openMenu}
      >
        <AccountCircleIcon sx={{ mr: 1 }} />
        {user?.display_name ?? 'Account'}
      </Button>
      <Menu
        anchorEl={anchorElement}
        id={menuId}
        open={open}
        onClose={closeMenu}
        slotProps={{ list: { 'aria-labelledby': buttonId } }}
      >
        {user && (
          <MenuItem disabled>
            <ListItemText
              primary={user.display_name}
              secondary={user.email || user.username}
            />
          </MenuItem>
        )}
        {user && <Divider />}
        {items.map(({ name, href, icon }) => (
          <MenuItem component="a" href={href} key={name} onClick={closeMenu}>
            <ListItemIcon>{icon}</ListItemIcon>
            {name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem component="a" href="/logout" onClick={closeMenu}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  )
}

DeathlabsUserMenu.displayName = 'DeathlabsUserMenu'
