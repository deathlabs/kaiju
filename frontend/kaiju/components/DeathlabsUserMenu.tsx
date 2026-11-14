import Button from '@mui/material/Button'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useId, useState, type MouseEvent } from 'react'

import type { DeathlabsNavBarItem } from './types'

export interface DeathlabsUserMenuProps {
  items: readonly DeathlabsNavBarItem[]
}

export const DeathlabsUserMenu = ({ items }: DeathlabsUserMenuProps) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null)
  const id = useId()
  const buttonId = `${id}-button`
  const menuId = `${id}-menu`
  const open = Boolean(anchorElement)

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorElement(event.currentTarget)
  }

  const closeMenu = () => {
    setAnchorElement(null)
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
        Account
      </Button>
      <Menu
        anchorEl={anchorElement}
        id={menuId}
        open={open}
        onClose={closeMenu}
        slotProps={{ list: { 'aria-labelledby': buttonId } }}
      >
        {items.map(({ name, href, icon }) => (
          <MenuItem component="a" href={href} key={name} onClick={closeMenu}>
            <ListItemIcon>{icon}</ListItemIcon>
            {name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

DeathlabsUserMenu.displayName = 'DeathlabsUserMenu'
