import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Card,
  CardContent,
  Typography,
  Chip
} from '@mui/material'
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as UsageIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import Const from '@/config/const'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/vouchers'
import * as VoucherService from '@/services/VoucherService'
import * as helper from '@/utils/helper'
import Pager from '@/components/Pager'
import Progress from '@/components/Progress'

import '@/assets/css/voucher-list.css'

interface VoucherListProps {
  user?: bookcarsTypes.User
  keyword?: string
  suppliers?: string[]
  activeStatuses?: boolean[]
  fundingTypes?: bookcarsTypes.VoucherFundingType[]
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Voucher>
  onDelete?: (rowCount: number) => void
}

const VoucherList = ({
  user,
  keyword: voucherListKeyword,
  suppliers,
  activeStatuses,
  fundingTypes,
  onDelete,
  onLoad
}: VoucherListProps) => {
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState(voucherListKeyword)
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Voucher[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [voucherId, setVoucherId] = useState('')
  const [voucherIndex, setVoucherIndex] = useState(-1)

  const fetchData = async (_page: number, _keyword?: string, _suppliers?: string[], _activeStatuses?: boolean[], _fundingTypes?: bookcarsTypes.VoucherFundingType[]) => {
    try {
      setLoading(true)

      const payload: bookcarsTypes.GetVouchersPayload = {}
      if (_suppliers && _suppliers.length > 0) {
        payload.suppliers = _suppliers
      }
      // Convert array filters to single values for backend compatibility
      if (_activeStatuses && _activeStatuses.length === 1) {
        payload.isActive = _activeStatuses[0]
      }
      if (_fundingTypes && _fundingTypes.length === 1) {
        payload.fundingType = _fundingTypes[0]
      }

      const data = await VoucherService.getVouchers(_keyword || '', payload, _page, env.PAGE_SIZE)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_page < Math.ceil(_totalRecords / env.PAGE_SIZE))

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (suppliers !== undefined && activeStatuses !== undefined && fundingTypes !== undefined) {
      if (init || keyword !== voucherListKeyword) {
        setKeyword(voucherListKeyword || '')
        setPage(1)
        fetchData(1, voucherListKeyword, suppliers, activeStatuses, fundingTypes)
      }
    }
  }, [init, keyword, voucherListKeyword, suppliers, activeStatuses, fundingTypes]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    const _voucherId = e.currentTarget.getAttribute('data-id') as string
    const _voucherIndex = Number.parseInt(e.currentTarget.getAttribute('data-index') as string, 10)

    setVoucherId(_voucherId)
    setVoucherIndex(_voucherIndex)
    setOpenDeleteDialog(true)
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setVoucherId('')
    setVoucherIndex(-1)
  }

  const handleConfirmDelete = async () => {
    try {
      if (voucherId !== '' && voucherIndex > -1) {
        setLoading(true)
        await VoucherService.deleteVoucher(voucherId)
        
        const _rowCount = rowCount - 1
        rows.splice(voucherIndex, 1)

        setRows(rows)
        setRowCount(_rowCount)
        setTotalRecords(totalRecords - 1)
        setOpenDeleteDialog(false)
        setVoucherId('')
        setVoucherIndex(-1)

        if (onDelete) {
          onDelete(_rowCount)
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const admin = helper.admin(user)

  return (
    <>
      {rows.length === 0 ? (
        !init && !loading && <Card variant="outlined" className="empty-list">
          <CardContent>
            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {rows.map((voucher, index) => (
            <div key={voucher._id} className="voucher-info">
              <Card variant="outlined" className="voucher-card">
                <CardContent>
                  <div className="voucher-info-header">
                    <Typography variant="h6" className="voucher-code">
                      {voucher.code}
                    </Typography>
                    <div className="voucher-actions">
                      <Tooltip title={strings.VIEW_USAGE}>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/voucher-usage?v=${voucher._id}`)}
                        >
                          <UsageIcon />
                        </IconButton>
                      </Tooltip>
                      {admin && (
                        <Tooltip title={commonStrings.UPDATE}>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/update-voucher?v=${voucher._id}`)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {admin && (
                        <Tooltip title={strings.DELETE_VOUCHER}>
                          <IconButton
                            size="small"
                            data-id={voucher._id}
                            data-index={index}
                            onClick={handleDelete}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  
                  <div className="voucher-info-content">
                    <div className="voucher-info-row">
                      <Typography variant="body2" color="textSecondary">
                        {strings.DISCOUNT_TYPE}:
                      </Typography>
                      <Typography variant="body2">
                        {voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage
                          ? `${voucher.discountValue}%`
                          : `${commonStrings.CURRENCY}${voucher.discountValue}`}
                      </Typography>
                    </div>
                    
                    <div className="voucher-info-row">
                      <Typography variant="body2" color="textSecondary">
                        {strings.FUNDING_TYPE}:
                      </Typography>
                      <Typography variant="body2">
                        {voucher.fundingType === bookcarsTypes.VoucherFundingType.Platform 
                          ? strings.PLATFORM
                          : voucher.fundingType === bookcarsTypes.VoucherFundingType.Supplier
                          ? strings.SUPPLIER_FUNDED
                          : strings.CO_FUNDED}
                      </Typography>
                    </div>
                    
                    <div className="voucher-info-row">
                      <Typography variant="body2" color="textSecondary">
                        {strings.USAGE_COUNT}:
                      </Typography>
                      <Typography variant="body2">
                        {voucher.usageCount} / {voucher.usageLimit || strings.UNLIMITED}
                      </Typography>
                    </div>
                    
                    <div className="voucher-info-row">
                      <Typography variant="body2" color="textSecondary">
                        {strings.VALID_FROM}:
                      </Typography>
                      <Typography variant="body2">
                        {(() => {
                          const d = new Date(voucher.validFrom)
                          return `${bookcarsHelper.formatDatePart(d.getDate())}-${bookcarsHelper.formatDatePart(d.getMonth() + 1)}-${d.getFullYear()}`
                        })()}
                      </Typography>
                    </div>
                    
                    <div className="voucher-info-row">
                      <Typography variant="body2" color="textSecondary">
                        {strings.VALID_TO}:
                      </Typography>
                      <Typography variant="body2">
                        {(() => {
                          const d = new Date(voucher.validTo)
                          return `${bookcarsHelper.formatDatePart(d.getDate())}-${bookcarsHelper.formatDatePart(d.getMonth() + 1)}-${d.getFullYear()}`
                        })()}
                      </Typography>
                    </div>

                    {/* Time Restrictions Display */}
                    {voucher.timeRestrictionEnabled && (
                      <div className="voucher-info-row">
                        <Typography variant="body2" color="textSecondary">
                          {strings.TIME_RESTRICTIONS}:
                        </Typography>
                        <div className="time-restrictions-chips">
                          {voucher.allowedTimeSlots && voucher.allowedTimeSlots.length > 0 && (
                            <Chip 
                              label={`${voucher.allowedTimeSlots.length} Time Slot${voucher.allowedTimeSlots.length > 1 ? 's' : ''}`}
                              size="small" 
                              variant="outlined"
                              color="primary"
                            />
                          )}
                          {voucher.allowedDaysOfWeek && voucher.allowedDaysOfWeek.length > 0 && voucher.allowedDaysOfWeek.length < 7 && (
                            <Chip 
                              label={`${voucher.allowedDaysOfWeek.length} Day${voucher.allowedDaysOfWeek.length > 1 ? 's' : ''}`}
                              size="small" 
                              variant="outlined"
                              color="secondary"
                            />
                          )}
                          {voucher.dailyUsageLimitEnabled && voucher.dailyUsageLimit && (
                            <Chip 
                              label={`${voucher.dailyUsageLimit}h/day max`}
                              size="small" 
                              variant="outlined"
                              color="warning"
                            />
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="voucher-info-row">
                      <Chip 
                        label={voucher.isActive ? strings.ACTIVE : strings.INACTIVE}
                        color={voucher.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          
          <Pager
            page={page}
            pageSize={env.PAGE_SIZE}
            rowCount={totalRecords}
            totalRecords={totalRecords}
            onNext={() => setPage(page + 1)}
            onPrevious={() => setPage(page - 1)}
          />
        </>
      )}

      {loading && <Progress />}

      <Dialog
        disableEscapeKeyDown
        maxWidth="xs"
        open={openDeleteDialog}
      >
        <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{strings.CONFIRM_DELETE_VOUCHER}</DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
            {commonStrings.CANCEL}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            {commonStrings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default VoucherList
