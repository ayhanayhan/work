export type IyzicoVerificationResult={
  status?:string;
  paymentStatus?:string;
  conversationId?:string;
  paidPrice?:string|number;
  price?:string|number;
  currency?:string;
  basketId?:string;
  paymentId?:string;
};

export type ExpectedIyzicoPayment={
  conversationId:string;
  amount:unknown;
  currency:string;
  basketId:string;
};

const normalizedMoney=(value:unknown)=>{
  const amount=Number(value);
  return Number.isFinite(amount)?Math.round(amount*100):Number.NaN;
};

export function isVerifiedIyzicoPayment(result:IyzicoVerificationResult,input:ExpectedIyzicoPayment){
  const actualAmount=normalizedMoney(result.paidPrice??result.price);
  const expectedAmount=normalizedMoney(input.amount);
  return result.status==='success'&&
    result.paymentStatus==='SUCCESS'&&
    String(result.conversationId||'')===input.conversationId&&
    Number.isFinite(actualAmount)&&actualAmount===expectedAmount&&
    String(result.currency||'').toUpperCase()===String(input.currency||'').toUpperCase()&&
    String(result.basketId||'')===input.basketId&&
    typeof result.paymentId==='string'&&result.paymentId.trim().length>0;
}
