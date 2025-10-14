import React, { useState } from 'react'
import { IconButton, Input, OutlinedInput } from '@mui/material'
import { Upload as UploadIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'

import '@/assets/css/driver-license.css'

interface ICDocumentProps {
  user?: bookcarsTypes.User
  variant?: 'standard' | 'outlined'
  hideDelete?: boolean
  className?: string
  onUpload?: (filename: string) => void
  onDelete?: () => void
}

const ICDocument = ({
  user,
  variant = 'standard',
  hideDelete = false,
  className,
  onUpload,
  onDelete,
}: ICDocumentProps) => {
  const [icDocument, setICDocument] = useState(user?.icDocument || null)

  const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    const upload = document.getElementById('upload-ic') as HTMLInputElement
    upload.value = ''
    setTimeout(() => {
      upload.click()
    }, 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      helper.error()
      return
    }

    const reader = new FileReader()
    const file = e.target.files[0]

    reader.onloadend = async () => {
      try {
        let filename: string | null = null
        if (user) {
          // upload new file
          const res = await UserService.updateIC(user._id!, file)
          if (res.status === 200) {
            filename = res.data
          } else {
            helper.error()
          }
        } else {
          // Remove previous temp file
          if (icDocument) {
            await UserService.deleteTempIC(icDocument)
          }
          // upload new file
          filename = await UserService.createIC(file)
        }

        if (filename) {
          if (onUpload) {
            onUpload(filename)
          }
        }

        setICDocument(filename)
      } catch (err) {
        helper.error(err)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className={`driver-license ${className || ''}`}>
      {variant === 'standard' ? (
        <Input
          value={icDocument || commonStrings.UPLOAD_FILE}
          readOnly
          onClick={handleClick}
          className="filename"
        />
      ) : (
        <OutlinedInput
          value={icDocument || commonStrings.UPLOAD_FILE}
          readOnly
          onClick={handleClick}
          className="filename"
        />
      )}
      <div className="actions">
        <IconButton
          onClick={handleClick}
        >
          <UploadIcon className="icon" />
        </IconButton>

        {icDocument && (
          <>
            <IconButton
              onClick={() => {
                const url = `${bookcarsHelper.trimEnd(user ? env.CDN_IC : env.CDN_TEMP_IC, '/')}/${icDocument}`
                helper.downloadURI(url)
              }}
            >
              <ViewIcon className="icon" />
            </IconButton>
            {!hideDelete && (
              <IconButton
                onClick={async () => {
                  try {
                    let status = 0
                    if (user) {
                      status = await UserService.deleteIC(user._id!)
                    } else {
                      status = await UserService.deleteTempIC(icDocument!)
                    }

                    if (status === 200) {
                      setICDocument(null)

                      if (onDelete) {
                        onDelete()
                      }
                    } else {
                      helper.error()
                    }
                  } catch (err) {
                    helper.error(err)
                  }
                }}
              >
                <DeleteIcon className="icon" />
              </IconButton>
            )}
          </>
        )}
      </div>
      <input id="upload-ic" type="file" hidden onChange={handleChange} accept="image/*,application/pdf" />
    </div>
  )
}

export default ICDocument
