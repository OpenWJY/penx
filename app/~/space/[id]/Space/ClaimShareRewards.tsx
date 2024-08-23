'use client'

import LoadingDots from '@/components/icons/loading-dots'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddress } from '@/hooks/useAddress'
import { useSpace } from '@/hooks/useSpace'
import { spaceAbi } from '@/lib/abi'
import { checkChain } from '@/lib/checkChain'
import { extractErrorMessage } from '@/lib/extractErrorMessage'
import { precision } from '@/lib/math'
import { wagmiConfig } from '@/lib/wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { toast } from 'sonner'
import { Address } from 'viem'
import { useReadContract, useWriteContract } from 'wagmi'

interface Props {}

export function ClaimShareRewards({}: Props) {
  const address = useAddress()
  const { space } = useSpace()
  const { data, isLoading, refetch } = useReadContract({
    address: space.spaceAddress as Address,
    abi: spaceAbi,
    functionName: 'currentContributorRewards',
    args: [address],
  })

  const { writeContractAsync, isPending } = useWriteContract()

  if (isLoading || typeof data === 'undefined') {
    return (
      <div className="space-x-1 h-20 w-96">
        <Skeleton></Skeleton>
        <Skeleton></Skeleton>
      </div>
    )
  }

  return (
    <div className="space-y-2 h-20">
      <div className="font-semibold">Space rewards</div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          className="rounded-xl w-24"
          onClick={async () => {
            try {
              await checkChain()
              const hash = await writeContractAsync({
                address: space.spaceAddress as Address,
                abi: spaceAbi,
                functionName: 'claimShareRewards',
              })

              await waitForTransactionReceipt(wagmiConfig, { hash })
              refetch()
              toast.success('Rewards claimed successfully!')
            } catch (error) {
              const msg = extractErrorMessage(error)
              toast.error(msg || 'Failed to claim rewards')
            }
          }}
        >
          {isPending ? <LoadingDots color="white" /> : <div>Claim</div>}
        </Button>
        <div className="text-green-500">
          + {precision.toDecimal(data).toFixed(2)} {space.symbolName}
        </div>
      </div>
    </div>
  )
}
