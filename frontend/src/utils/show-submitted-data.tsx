import { toast } from 'sonner'

export function showSubmittedData(
  data: unknown,
  title: string = 'You submitted the following values:'
) {
  toast.message(title, {
    description: (
      // w-[340px]
      <pre className='mt-2 w-full overflow-x-auto rounded-md bg-slate-950 p-4'>
        <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
      </pre>
    ),
    duration: 20000, // 20秒后自动消失
    dismissible: true, // 允许用户手动关闭
    closeButton: true, // 显示关闭按钮
  })
}
