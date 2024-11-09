import { forwardRef, useRef, useState } from 'react'
import { ITitleElement } from '@/components/editor/plugins/title-plugin'
import LoadingDots from '@/components/icons/loading-dots'
import { uploadFile } from '@/lib/uploadFile'
import { getUrl, isIPFSCID } from '@/lib/utils'
import { ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import { Transforms } from 'slate'
import { ReactEditor, useSlate } from 'slate-react'

export function CoverUpload({ element }: any) {
  const [value, setValue] = useState(element?.props?.image || '')
  const editor = useSlate()
  const path = ReactEditor.findPath(editor as any, element)
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log('====e.target.files:', e.target.files)

    if (e.target.files?.length) {
      setLoading(true)
      const file = e.target.files[0]
      const src = URL.createObjectURL(file)
      setValue(src)

      try {
        const data = await uploadFile(file)

        const uri = data.url || data.cid || ''

        Transforms.setNodes(
          editor,
          {
            props: { ...element?.props, image: uri },
          } as ITitleElement,
          { at: path },
        )

        setValue(
          isIPFSCID(uri)
            ? `https://ipfs-gateway.spaceprotocol.xyz/ipfs/${uri}`
            : uri,
        )
      } catch (error) {
        console.log('Failed to upload file:', error)
      }

      setLoading(false)
    }
  }

  async function removeCover() {
    setValue('')

    console.log('remove....')
    Transforms.setNodes(
      editor,
      {
        props: { ...element?.props, image: '' },
      } as ITitleElement,
      { at: path },
    )
  }

  if (value) {
    return (
      <div className="w-full h-[360px] relative" contentEditable={false}>
        <Image
          src={getUrl(value)}
          width={1000}
          height={1000}
          className="absolute left-0 top-0 w-full h-[360px] cursor-pointer object-cover"
          alt=""
        />

        <X
          className="absolute top-1 right-1 bg-foreground/5 rounded-full p-1 text-foreground/80 w-8 h-8 cursor-pointer"
          onClick={removeCover}
        />
      </div>
    )
  }

  return (
    <div className="flex">
      <div
        className="w-24 h-8 flex relative cursor-pointer items-center"
        contentEditable={false}
      >
        <div className="absolute left-0 top-0 w-full h-full cursor-pointer z-1 flex items-center justify-center gap-1 text-foreground/30 hover:text-foreground/50 text-xs font-normal">
          <ImageIcon size={16} />
          <div>Add cover</div>
        </div>

        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          className="absolute left-0 top-0 opacity-0 w-full h-full cursor-pointer z-10"
        />
        {loading && <LoadingDots />}
      </div>
    </div>
  )
}