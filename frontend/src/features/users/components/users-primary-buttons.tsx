import { IconRefresh, IconUserPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useUsers } from '../context/users-context'

export function UsersPrimaryButtons() {
  const { setOpen, refreshUsers, loading } = useUsers()
  
  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => refreshUsers()}
        disabled={loading}
      >
        <span>刷新</span> <IconRefresh size={18} className={loading ? 'animate-spin' : ''} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>添加用户</span> <IconUserPlus size={18} />
      </Button>
    </div>
  )
}
