import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button
} from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/vouchers'
import * as VoucherService from '@/services/VoucherService'
import * as helper from '@/utils/helper'
import { UserContextType, useUserContext } from '@/context/UserContext'
import NoMatch from '@/pages/NoMatch'
import Backdrop from '@/components/SimpleBackdrop'

import '@/assets/css/voucher-usage.css'

const VoucherUsage = () => {
  const navigate = useNavigate()
  const { user } = useUserContext() as UserContextType
  const [searchParams] = useSearchParams()

  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [usageData, setUsageData] = useState<bookcarsTypes.VoucherUsageResult>()

  const voucherId = searchParams.get('v')

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!voucherId) {
          setNoMatch(true)
          return
        }

        setLoading(true)

        const data = await VoucherService.getVoucherUsage(voucherId)
        if (!data) {
          setNoMatch(true)
          return
        }

        setUsageData(data)
      } catch (err) {
        helper.error(err)
        setNoMatch(true)
      } finally {
        setLoading(false)
      }
    }

    if (user && voucherId) {
      fetchData()
    }
  }, [user, voucherId])

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setVisible(true)
    }
  }

  if (noMatch) {
    return <NoMatch />
  }

  return (
    <Layout onLoad={onLoad} strict>
      {visible && usageData && (
        <div className="voucher-usage">
          <div className="voucher-usage-header">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/vouchers')}
              className="back-button"
            >
              {commonStrings.BACK}
            </Button>
            <Typography variant="h4" className="voucher-usage-title">
              {strings.USAGE_STATISTICS}
            </Typography>
          </div>

          {/* Voucher Information */}
          <Paper className="voucher-info-paper" elevation={3}>
            <Typography variant="h6" className="section-title">
              {strings.VOUCHER} {strings.INFORMATION}
            </Typography>
            
            <div className="voucher-details">
              <div className="voucher-detail-row">
                <Typography variant="body1" className="detail-label">
                  {strings.VOUCHER_CODE}:
                </Typography>
                <Typography variant="body1" className="voucher-code">
                  {usageData.voucher.code}
                </Typography>
              </div>

              <div className="voucher-detail-row">
                <Typography variant="body1" className="detail-label">
                  {strings.DISCOUNT_TYPE}:
                </Typography>
                <Typography variant="body1">
                  {usageData.voucher.discountType === bookcarsTypes.VoucherDiscountType.Percentage 
                    ? `${usageData.voucher.discountValue}%` 
                    : `$${usageData.voucher.discountValue}`}
                </Typography>
              </div>

              <div className="voucher-detail-row">
                <Typography variant="body1" className="detail-label">
                  {strings.FUNDING_TYPE}:
                </Typography>
                <Typography variant="body1">
                  {usageData.voucher.fundingType === bookcarsTypes.VoucherFundingType.Platform 
                    ? strings.PLATFORM
                    : usageData.voucher.fundingType === bookcarsTypes.VoucherFundingType.Supplier
                    ? strings.SUPPLIER_FUNDED
                    : strings.CO_FUNDED}
                </Typography>
              </div>

              {/* Time Restrictions Details */}
              {usageData.voucher.timeRestrictionEnabled && (
                <div className="voucher-detail-row">
                  <Typography variant="body1" className="detail-label">
                    {strings.TIME_RESTRICTIONS}:
                  </Typography>
                  <div className="time-restrictions-details">
                    {usageData.voucher.allowedTimeSlots && usageData.voucher.allowedTimeSlots.length > 0 && (
                      <div className="time-restriction-item">
                        <Typography variant="body2" className="restriction-label">
                          {strings.ALLOWED_TIME_SLOTS}:
                        </Typography>
                        <div className="time-slots">
                          {usageData.voucher.allowedTimeSlots.map((slot, index) => (
                            <Chip
                              key={index}
                              label={`${slot.startHour.toString().padStart(2, '0')}:00 - ${slot.endHour.toString().padStart(2, '0')}:00`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {usageData.voucher.allowedDaysOfWeek && usageData.voucher.allowedDaysOfWeek.length > 0 && usageData.voucher.allowedDaysOfWeek.length < 7 && (
                      <div className="time-restriction-item">
                        <Typography variant="body2" className="restriction-label">
                          {strings.ALLOWED_DAYS}:
                        </Typography>
                        <div className="allowed-days">
                          {usageData.voucher.allowedDaysOfWeek.map((day) => (
                            <Chip
                              key={day}
                              label={
                                day === 0 ? strings.SUNDAY :
                                day === 1 ? strings.MONDAY :
                                day === 2 ? strings.TUESDAY :
                                day === 3 ? strings.WEDNESDAY :
                                day === 4 ? strings.THURSDAY :
                                day === 5 ? strings.FRIDAY :
                                strings.SATURDAY
                              }
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {usageData.voucher.dailyUsageLimitEnabled && usageData.voucher.dailyUsageLimit && (
                      <div className="time-restriction-item">
                        <Typography variant="body2" className="restriction-label">
                          {strings.DAILY_USAGE_LIMIT}:
                        </Typography>
                        <Chip
                          label={`${usageData.voucher.dailyUsageLimit} hours per day`}
                          size="small"
                          variant="outlined"
                          color="warning"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="voucher-detail-row">
                <Typography variant="body1" className="detail-label">
                  {strings.ACTIVE}:
                </Typography>
                <Chip 
                  label={usageData.voucher.isActive ? strings.ACTIVE : strings.INACTIVE}
                  color={usageData.voucher.isActive ? 'success' : 'error'}
                  size="small"
                />
              </div>
            </div>
          </Paper>

          {/* Usage Statistics */}
          <Paper className="statistics-paper" elevation={3}>
            <Typography variant="h6" className="section-title">
              {strings.USAGE_STATISTICS}
            </Typography>
            
            <div className="statistics-grid">
              <Card className="stat-card" variant="outlined">
                <CardContent>
                  <Typography variant="h4" className="stat-number">
                    {usageData.statistics.totalUsages}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {strings.TOTAL_USAGES}
                  </Typography>
                </CardContent>
              </Card>

              <Card className="stat-card" variant="outlined">
                <CardContent>
                  <Typography variant="h4" className="stat-number">
                    ${usageData.statistics.totalDiscountGiven.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {strings.TOTAL_DISCOUNT_GIVEN}
                  </Typography>
                </CardContent>
              </Card>

              <Card className="stat-card" variant="outlined">
                <CardContent>
                  <Typography variant="h4" className="stat-number">
                    {usageData.statistics.remainingUsages ?? strings.UNLIMITED}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {strings.REMAINING_USAGES}
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </Paper>

          {/* Usage History */}
          {usageData.usages.length > 0 && (
            <Paper className="usage-history-paper" elevation={3}>
              <Typography variant="h6" className="section-title">
                Usage History
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{strings.USED_BY}</TableCell>
                      <TableCell>{strings.BOOKING}</TableCell>
                      <TableCell>{strings.DISCOUNT_APPLIED}</TableCell>
                      <TableCell>{strings.USED_AT}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usageData.usages.map((usage) => (
                      <TableRow key={usage._id}>
                        <TableCell>
                          {typeof usage.user === 'object' ? usage.user.fullName : usage.user}
                        </TableCell>
                        <TableCell>
                          {typeof usage.booking === 'object' ? usage.booking._id : usage.booking}
                        </TableCell>
                        <TableCell>
                          ${usage.discountApplied.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(usage.usedAt).toLocaleString(user?.language === 'fr' ? 'fr-FR' : 'en-US')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {usageData.usages.length === 0 && (
            <Paper className="no-usage-paper" elevation={3}>
              <Typography variant="body1" color="textSecondary" align="center">
                This voucher has not been used yet.
              </Typography>
            </Paper>
          )}
        </div>
      )}

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default VoucherUsage
