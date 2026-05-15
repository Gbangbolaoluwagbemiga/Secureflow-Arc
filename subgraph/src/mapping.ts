import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  EscrowCreated,
  EvidenceSubmitted,
  ApplicationSubmitted,
  EscrowUpdated
} from "../generated/SecureFlow/SecureFlow"
import { Escrow, Evidence, Application } from "../generated/schema"

export function handleEscrowCreated(event: EscrowCreated): void {
  let entity = new Escrow(event.params.escrowId.toString())
  entity.escrowId = event.params.escrowId
  entity.depositor = event.params.depositor
  entity.beneficiary = event.params.beneficiary
  entity.totalAmount = event.params.totalAmount
  entity.token = event.params.token
  entity.deadline = event.params.deadline
  entity.arbiters = event.params.arbiters as Bytes[]
  entity.requiredConfirmations = event.params.requiredConfirmations
  entity.isOpenJob = event.params.isOpenJob
  entity.status = 0 // Active
  entity.createdAt = event.block.timestamp
  entity.updatedAt = event.block.timestamp
  entity.save()
}

export function handleEvidenceSubmitted(event: EvidenceSubmitted): void {
  let entity = new Evidence(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.escrowId = event.params.escrowId
  entity.milestoneIndex = event.params.milestoneIndex
  entity.submitter = event.params.submitter
  entity.cid = event.params.cid
  entity.timestamp = event.block.timestamp
  entity.save()
}

export function handleApplicationSubmitted(event: ApplicationSubmitted): void {
  let entity = new Application(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.escrowId = event.params.escrowId
  entity.freelancer = event.params.freelancer
  entity.coverLetter = event.params.coverLetter
  entity.proposedTimeline = event.params.proposedTimeline
  entity.timestamp = event.block.timestamp
  entity.save()
}

export function handleEscrowUpdated(event: EscrowUpdated): void {
  let entity = Escrow.load(event.params.escrowId.toString())
  if (entity) {
    entity.status = event.params.status
    entity.updatedAt = event.params.timestamp
    entity.save()
  }
}
