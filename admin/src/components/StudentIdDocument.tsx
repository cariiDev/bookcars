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

interface StudentIdDocumentProps {
  user?: bookcarsTypes.User
  variant?: 'standard' | 'outlined'
  hideDelete?: boolean
  className?: string
  onUpload?: (filename: string) => void
  onDelete?: () => void
}

const StudentIdDocument = ({
  user,
  variant = 'standard',
  hideDelete = false,
  className,
  onUpload,
  onDelete,
}: StudentIdDocumentProps) => {
  const [studentIdDocument, setStudentIdDocument] = useState(user?.studentIdDocument || null)

  const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    const upload = document.getElementById('upload-student-id') as HTMLInputElement
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
          const res = await UserService.updateStudentIdDocument(user._id!, file)
          if (res.status === 200) {
            filename = res.data
          } else {
            helper.error()
          }
        } else {
          if (studentIdDocument) {
            await UserService.deleteTempStudentIdDocument(studentIdDocument)
          }
          filename = await UserService.createStudentIdDocument(file)
        }

        if (filename) {
          if (onUpload) {
            onUpload(filename)
          }
        }

        setStudentIdDocument(filename)
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
          value={studentIdDocument || commonStrings.UPLOAD_STUDENT_ID}
          readOnly
          onClick={handleClick}
          className="filename"
        />
      ) : (
        <OutlinedInput
          value={studentIdDocument || commonStrings.UPLOAD_STUDENT_ID}
          readOnly
          onClick={handleClick}
          className="filename"
        />
      )}
      <div className="actions">
        <IconButton onClick={handleClick}>
          <UploadIcon className="icon" />
        </IconButton>

        {studentIdDocument && (
          <>
            <IconButton
              onClick={() => {
                const url = `${bookcarsHelper.trimEnd(user ? env.CDN_STUDENT_IDS : env.CDN_TEMP_STUDENT_IDS, '/')}/${studentIdDocument}`
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
                      status = await UserService.deleteStudentIdDocument(user._id!)
                    } else {
                      status = await UserService.deleteTempStudentIdDocument(studentIdDocument!)
                    }

                    if (status === 200) {
                      setStudentIdDocument(null)

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
      <input id="upload-student-id" type="file" hidden onChange={handleChange} accept="image/*" />
    </div>
  )
}

export default StudentIdDocument
