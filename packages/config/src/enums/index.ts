export enum DealState {
  Created,
  Joined,
  Signed,
  Funded,
  DeliveryConfirmed,
  RefundRequested,
  Disputed,
  Resolved,
  TimedOut,
}

export enum ResolutionType {
  None,
  Delivery,
  Refund,
  MiddlemanBuyer,
  MiddlemanSeller,
  Timeout,
}

export enum ParticipantRole {
  Client,
  Seller,
  Middleman,
}
