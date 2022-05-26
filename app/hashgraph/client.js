import {
	PrivateKey,
	AccountBalanceQuery,
	TopicInfoQuery,
	TopicCreateTransaction,
	TopicUpdateTransaction,
	TopicMessageSubmitTransaction,
	TransactionRecordQuery,
	TopicId,
	TokenCreateTransaction,
	Hbar,
	HbarUnit,
	AccountCreateTransaction,
	TokenAssociateTransaction,
	TokenId,
	TokenUpdateTransaction,
	TransferTransaction,
	TokenFreezeTransaction,
	TokenUnfreezeTransaction,
	TokenGrantKycTransaction,
	TokenRevokeKycTransaction,
	ContractCreateTransaction,
	ContractInfoQuery,
	ContractByteCodeQuery,
	ContractDeleteTransaction,
	ContractExecuteTransaction,
	ContractCallQuery,
	NftId,
	TokenNftInfoQuery,
	TokenGetInfoQuery,
	KeyList,
	ScheduleCreateTransaction,
	ScheduleSignTransaction,
	ScheduleInfoQuery,
	TransactionReceiptQuery,
	AccountId,
} from "@hashgraph/sdk"
import HashgraphClientContract from "./contract"
import HashgraphNodeNetwork from "./network"
import Config from "app/config"
import sleep from "app/utils/sleep"
import Encryption from "app/utils/encryption"
import Explorer from "app/utils/explorer"
import sendWebhookMessage from "app/utils/sendWebhookMessage"
import Specification from "app/hashgraph/tokens/specifications"


class HashgraphClient extends HashgraphClientContract {
	// Keep a private internal reference to SDK client
	#client

	constructor() {
		super()

		this.#client = HashgraphNodeNetwork.getNodeNetworkClient()
	}

	/**
	 * Skipping the admin signing of the transaction as this API is accessed through an authKey
	 **/
	async createNewTopic({ memo, enable_private_submit_key }) {
		const client = this.#client
		const transactionResponse = {}
		const operatorPrivateKey = PrivateKey.fromString(Config.privateKey)
		const transaction = new TopicCreateTransaction()

		transaction.setAdminKey(operatorPrivateKey.publicKey)

		if (memo) {
			transactionResponse.memo = memo
			transaction.setTopicMemo(memo)
		}

		if (enable_private_submit_key) {
			transaction.setSubmitKey(operatorPrivateKey.publicKey)
		}

		const transactionId = await transaction.execute(client)
		const receipt = await transactionId.getReceipt(client)

		return {
			...transactionResponse,
			topic: receipt.topicId.toString()
		}
	}

	async getTopicInfo(topic_id) {
		const client = this.#client

		const topic = await new TopicInfoQuery()
			.setTopicId(topic_id)
			.execute(client)

		return topic
	}

	// Only allow for a topic's memo to be updated
	async updateTopic({ topic_id, memo }) {
		const client = this.#client
		const topic = await new TopicUpdateTransaction()
			.setTopicId(topic_id)
			.setTopicMemo(memo)
			.execute(client)

		return topic
	}

	async accountBalanceQuery() {
		const client = this.#client

		const balance = await new AccountBalanceQuery()
			.setAccountId(Config.accountId)
			.execute(client)

		return { balance: parseFloat(balance.hbars.toString()) }
	}

	async userAccountBalanceQuery({ accound_id, token_id }) {
		const client = this.#client

		const balance = await new AccountBalanceQuery()
			.setAccountId(accound_id)
			.execute(client)

		if (balance == null) {
			return null;
		}

		return { balance: parseFloat(balance.tokens._map.get([token_id].toString()).toString()) }
	}
		
	async sendConsensusMessage({
		reference,
		allow_synchronous_consensus,
		message,
		topic_id
	}) {
		const client = this.#client

		const transaction = await new TopicMessageSubmitTransaction({
			topicId: TopicId.fromString(topic_id),
			message: message
		}).execute(client)

		// Remember to allow for mainnet links for explorer
		const messageTransactionResponse = {
			reference,
			topic_id,
			transaction_id: transaction.transactionId.toString(),
			explorer_url: Explorer.getExplorerUrl(transaction.transactionId)
		}

		const syncMessageConsensus = async () => {
			await sleep()

			const record = await new TransactionRecordQuery()
				.setTransactionId(transaction.transactionId)
				.execute(client)

			const { seconds, nanos } = record.consensusTimestampstamp

			const consensusResult = {
				...messageTransactionResponse,
				consensus_timestamp: {
					seconds: seconds.toString(),
					nanos: nanos.toString()
				},
				reference: reference
			}

			await sendWebhookMessage(consensusResult)

			return consensusResult
		}

		if (allow_synchronous_consensus) {
			return await syncMessageConsensus()
		}

		if (Config.webhookUrl) {
			await syncMessageConsensus()
		}

		return messageTransactionResponse
	}

	// Before transferring token to other account association is require
	async associateToAccount({ privateKey, tokenIds, accountId }) {
		const client = this.#client

		const transaction = await new TokenAssociateTransaction()
			.setAccountId(accountId)
			.setTokenIds(tokenIds)
			.freezeWith(client)

		const accountPrivateKey = PrivateKey.fromString(privateKey)
		const signTx = await transaction.sign(accountPrivateKey)

		return await signTx.execute(client)
	}

	bequestToken = async ({
		specification = Specification.Fungible,
		token_id,
		receiver_id,
		amount
	}) => {
		const client = this.#client

		const adjustedAmountBySpec = amount * 10 ** specification.decimals

		const signature = await new TransferTransaction()
			.addTokenTransfer(token_id, Config.accountId, -adjustedAmountBySpec)
			.addTokenTransfer(token_id, receiver_id, adjustedAmountBySpec)
			//.memo()
			.execute(client)


		// const balance = await new AccountBalanceQuery()
		// 	.setAccountId(receiver_id)
		// 	.execute(client)


		// const recverbalance = balance.tokens._map.get([token_id].toString()).toString();

		return {
			transactionId: signature.transactionId.toString(),
			balance: parseFloat(0)
		}
	}

	bequestNFT = async ({
		specification = Specification.Fungible,
		token_id,
		receiver_id,
	}) => {
		const client = this.#client

		const adjustedAmountBySpec = amount * 10 ** specification.decimals

		const signature = await new TransferTransaction()
			.addTokenTransfer(token_id, Config.accountId, -adjustedAmountBySpec)
			.addTokenTransfer(token_id, receiver_id, adjustedAmountBySpec)
			//.memo()
			.execute(client)


		// const balance = await new AccountBalanceQuery()
		// 	.setAccountId(receiver_id)
		// 	.execute(client)


		// const recverbalance = balance.tokens._map.get([token_id].toString()).toString();

		return {
			transactionId: signature.transactionId.toString(),
			balance: parseFloat(0)
		}
	}

	recvToken = async ({
		specification = Specification.Fungible,
		encrypted_receiver_key,
		token_id,
		sender_id,
		amount
	}) => {

		const client = this.#client

		// Extract PV from encrypted
		const privateKey = await Encryption.decrypt(encrypted_receiver_key)

		const { tokens } = await new AccountBalanceQuery()
			.setAccountId(sender_id)
			.execute(client)

		const token = JSON.parse(tokens.toString())[token_id]
		const adjustedAmountBySpec = amount * 10 ** specification.decimals

		if (token < adjustedAmountBySpec) {

			return false
		}

		let transaction = await new TransferTransaction()
			.addTokenTransfer(token_id, sender_id, -(adjustedAmountBySpec))
			.addTokenTransfer(token_id, Config.accountId, adjustedAmountBySpec)
			.freezeWith(client);


		//Sign with the sender account private key
		const signTx = await transaction.sign(PrivateKey.fromString(privateKey));

		//Sign with the client operator private key and submit to a Hedera network
		const txResponse = await signTx.execute(client);


		const balance = await new AccountBalanceQuery()
			.setAccountId(sender_id)
			.execute(client)

		const senderbalance = balance.tokens._map.get([token_id].toString()).toString();


		return {
			transactionId: transaction.transactionId.toString(),
			balance: parseFloat(senderbalance)
		}
	}

	scheduledSign = async ({
		scheduledId,
		scheduledTxId,
		privateKey,
	}) => {

		const client = this.#client

		console.log("info.scheduleId " + scheduledId.toString());

		const query = new ScheduleInfoQuery()
     		.setScheduleId(scheduledId);

		const info = await query.execute(client);

		//Submit the second signature
		const signature = await new ScheduleSignTransaction()
			.setScheduleId(info.scheduleId)
			.setMaxTransactionFee(new Hbar(1))
			.freezeWith(client)
			.sign(PrivateKey.fromString(privateKey))
			
		const txResponse = await signature.execute(client);

		console.log("signature.transactionId " + signature.transactionId.toString());
		console.log("signature.scheduleId " + signature.scheduleId.toString());

		//Verify the transaction was successful
		const receipt = await txResponse.getReceipt(client);

		let scheduleQuery = await new ScheduleInfoQuery().setScheduleId(info.scheduleId).execute(client);

		console.log(`- Schedule triggered (all required signatures received): ${scheduleQuery.executed !== null}`);

		console.log("The transaction status " + receipt.status.toString());

		return receipt.status.toString();
	}

	atomicSwapScheduled = async ({
		specification = Specification.Fungible,
		encrypted_receiver_key,
		token_id1,
		token_id2,
		account_id1,
		account_id2,
		serialNum,
		amount
	}) => {

		const client = this.#client

		console.log("The amount is " + amount);

		const { tokens } = await new AccountBalanceQuery()
			.setAccountId(account_id1)
			.execute(client)

		const token = JSON.parse(tokens.toString())[token_id1]
		const adjustedAmountBySpec = amount * 10 ** specification.decimals
		//const adjustedAmountBySpec = amount
		
		if (token < adjustedAmountBySpec) {
			return false
		}

		console.log("The adjustedAmountBySpec is " + adjustedAmountBySpec);

		const transaction = await new TransferTransaction()
			.addTokenTransfer(token_id1, account_id1, -(adjustedAmountBySpec))
			.addTokenTransfer(token_id1, account_id2, adjustedAmountBySpec)
			.addNftTransfer(token_id2, serialNum, account_id2, account_id1)
			.setMaxTransactionFee(new Hbar(1))

		console.log("transaction");

		//Schedule a transaction
		const scheduleTransaction = await new ScheduleCreateTransaction()
			.setScheduledTransaction(transaction)
			.setPayerAccountId(AccountId.fromString(account_id1))
			.setMaxTransactionFee(new Hbar(1))

		console.log("AccountId " + AccountId.fromString(account_id1).toString());

		const scResponse = await scheduleTransaction.execute(client);

		//Get the receipt of the transaction
		const receipt = await scResponse.getReceipt(client);
		console.log("receipt " + receipt.status.toString());

		//Get the schedule ID
		const scheduleId = receipt.scheduleId;
		console.log("The schedule ID is " + scheduleId.toString());

		//Get the scheduled transaction ID
		const scheduledTxId = receipt.scheduledTransactionId;
		console.log("The scheduled transaction ID is " + scheduledTxId.toString());

		// const signature = await new ScheduleSignTransaction()
		// 	.setScheduleId(scheduleId)
		// 	.freezeWith(client)
		// 	.sign(PrivateKey.fromString(Config.privateKey));

		// const txResponse = await signature.execute(client);

		// //Get the receipt of the transaction
		// const receipt1 = await txResponse.getReceipt(client);

		// //Get the transaction status
		// const transactionStatus = receipt1.status;
		// console.log("The transaction consensus status is " + transactionStatus);

		// console.log("signature");


		// const signature2 = await new ScheduleSignTransaction()
		// 	.setScheduleId(scheduleId)
		// 	.freezeWith(client)
		// 	.sign(PrivateKey.fromString(encrypted_receiver_key))
			
		// const txResponse2 = await signature2.execute(client);

		// //Get the receipt of the transaction
		// const receipt2 = await txResponse2.getReceipt(client);

		// //Get the transaction status
		// const transactionStatus2 = receipt2.status;
		// console.log("The transaction consensus status is " + transactionStatus2);

		// console.log("signature2");
		

		const sid = scheduleId.toString();
		const stid = scheduledTxId.toString();

		const balance = await new AccountBalanceQuery()
			.setAccountId(account_id1)
			.execute(client)

		const senderbalance = balance.tokens._map.get([token_id1].toString()).toString();

		return {
			sid,
			stid,
			balance: parseFloat(senderbalance)
		}
	}

	atomicSwap = async ({
		specification = Specification.Fungible,
		encrypted_receiver_key,
		token_id1,
		token_id2,
		account_id1,
		account_id2,
		serialNum,
		amount
	}) => {

		const client = this.#client

		console.log("The amount is " + amount);

		// const assotransaction = await new TokenAssociateTransaction()
		// 	.setAccountId(account_id1)
		// 	.setTokenId(token_id2)
		// 	.freezeWith(client)

		// const accountPrivateKey = PrivateKey.fromString(privateKey)
		// const assosign = await assotransaction.sign(accountPrivateKey)

		// assosign.execute(client)

		const { tokens } = await new AccountBalanceQuery()
			.setAccountId(account_id1)
			.execute(client)

		const token = JSON.parse(tokens.toString())[token_id1]
		const adjustedAmountBySpec = amount * 10 ** specification.decimals
		//const adjustedAmountBySpec = amount

		if (token < adjustedAmountBySpec) 
		{
			return false
		}		

		console.log("The serialNum is " + serialNum);

		let transaction = await new TransferTransaction()
			.addTokenTransfer(token_id1, account_id1, -(adjustedAmountBySpec))
			.addTokenTransfer(token_id1, account_id2, adjustedAmountBySpec)
			.addNftTransfer(token_id2, serialNum, account_id2, account_id1)
			.freezeWith(client);

		//Sign with the sender account private key
		const txResponse = await (await (await transaction.sign(PrivateKey.fromString(encrypted_receiver_key))).sign(PrivateKey.fromString(Config.privateKey))).execute(client);

		//Request the receipt of the transaction
		const receipt = await txResponse.getReceipt(client);

		if(receipt.status.toString() !== "SUCCESS")
		{
			return false;
		}

		console.log("sign");

		//Sign with the client operator private key and submit to a Hedera network
		//const txResponse = await signTx.execute(client);


		const balance = await new AccountBalanceQuery()
			.setAccountId(account_id1)
			.execute(client)

		const senderbalance = balance.tokens._map.get([token_id1].toString()).toString();


		return {
			transactionId: transaction.transactionId.toString(),
			balance: parseFloat(senderbalance)
		}
	}

	freezeToken = async ({
		acount_id,
		token_id
	}) => {
		const client = this.#client

		//Freeze an account from transferring a token
		const transaction = await new TokenFreezeTransaction()
			.setAccountId(acount_id)
			.setTokenId(token_id)
			.freezeWith(client)

		const privatekey = PrivateKey.fromString(Config.freezeKey);

		const signTx = await transaction.sign(privatekey);

		//Submit the transaction to a Hedera network    
		const txResponse = await signTx.execute(client);

		//Request the receipt of the transaction
		const receipt = await txResponse.getReceipt(client);

		//Get the transaction consensus status
		const transactionStatus = receipt.status;

		console.log("The transaction consensus status " + transactionStatus.toString());

		if (transactionStatus.toString() === "SUCCESS") {
			return {
				acount_id,
				token_id,
			}
		}
		else {
			return false;
		}
	}


	unfreezeToken = async ({
		acount_id,
		token_id
	}) => {
		const client = this.#client

		//Freeze an account from transferring a token
		const transaction = await new TokenUnfreezeTransaction()
			.setAccountId(acount_id)
			.setTokenId(token_id)
			.freezeWith(client)

		//Sign with the freeze key of the token 
		const privatekey = PrivateKey.fromString(Config.freezeKey);

		const signTx = await transaction.sign(privatekey);

		//Submit the transaction to a Hedera network    
		const txResponse = await signTx.execute(client);

		//Request the receipt of the transaction
		const receipt = await txResponse.getReceipt(client);

		//Get the transaction consensus status
		const transactionStatus = receipt.status;

		console.log("The transaction consensus status " + transactionStatus.toString());

		if (transactionStatus.toString() === "SUCCESS") {
			return {
				acount_id,
				token_id,
			}
		}
		else {
			return false;
		}
	}

	grantKyc = async ({
		acount_id,
		token_id,
		//encrypted_receiver_key
	}) => {
		const client = this.#client

		// ** 계정 활성화 **
		// const privateKey = await Encryption.decrypt(encrypted_receiver_key)
		// //Sign with the freeze key of the token
		
		// const transaction = await new TokenAssociateTransaction()
		// 	.setAccountId(acount_id)
		// 	.setTokenIds([token_id])
		// 	.freezeWith(client);
		
		// //Sign with the private key of the account that is being associated to a token 
		// const signTx = await transaction.sign(PrivateKey.fromString(privateKey));
		// const response = signTx.execute(client);
		// ** 계정 활성화 종료 **
		
		//KYC �ο�
		const revokeKyctransaction = await new TokenGrantKycTransaction()
			.setAccountId(acount_id)
			.setTokenId(token_id)
			.freezeWith(client);
			
			
		const balance = await new AccountBalanceQuery()
		.setAccountId(acount_id)
		.execute(client)

		if (balance == null) {
			return false;
		}

		if (balance.tokens._map.has(token_id) == false) {

			return false;
		}

		//Sign with the kyc private key of the token
		const signrevokeKycTx = await revokeKyctransaction.sign(PrivateKey.fromString(Config.kycKey));
			
		//Submit the transaction to a Hedera network    
		await signrevokeKycTx.execute(client);

		return {
			acount_id,
			token_id,
		}
	}

	enableUserAccountToken = async ({
		acount_id,
		token_id,
		//encrypted_receiver_key
	}) => {
		const client = this.#client

		// ** 계정 활성화 **
		// const privateKey = await Encryption.decrypt(encrypted_receiver_key)
		// //Sign with the freeze key of the token
		
		// const transaction = await new TokenAssociateTransaction()
		// 	.setAccountId(acount_id)
		// 	.setTokenIds([token_id])
		// 	.freezeWith(client);
		
		// //Sign with the private key of the account that is being associated to a token 
		// const signTx = await transaction.sign(PrivateKey.fromString(privateKey));
		// const response = signTx.execute(client);
		// ** 계정 활성화 종료 **
		
		//KYC �ο�
		const revokeKyctransaction = await new TokenGrantKycTransaction()
			.setAccountId(acount_id)
			.setTokenId(token_id)
			.freezeWith(client);
			
			
		//Sign with the kyc private key of the token
		const signrevokeKycTx = await revokeKyctransaction.sign(PrivateKey.fromString(Config.kycKey));
			
		//Submit the transaction to a Hedera network    
		await signrevokeKycTx.execute(client);

		const balance = await new AccountBalanceQuery()
			.setAccountId(acount_id)
			.execute(client)

		if (balance == null) {
			return null;
		}

		if (balance.tokens._map.has(token_id) == false) {

			return null;
		}


		return {
			acount_id,
			token_id,
		}
	}


	createAccount = async () => {
		const privateKey = await PrivateKey.generate()
		const publicKey = privateKey.publicKey
		const client = this.#client
		const transaction = new AccountCreateTransaction()
			.setKey(publicKey)
			.setInitialBalance(0.1)

		const txResponse = await transaction.execute(client)
		const receipt = await txResponse.getReceipt(client)
		const accountId = receipt.accountId.toString()
		const encryptedKey = await Encryption.encrypt(privateKey.toString())

		return {
			accountId,
			encryptedKey,
			publicKey: publicKey.toString()
		}
	}

	createToken = async tokenCreation => {
		const {
			specification = Specification.Fungible,
			memo,
			name,
			symbol,
			supply
		} = tokenCreation

		const client = this.#client

		const operatorPrivateKey = PrivateKey.fromString(Config.privateKey)

		const supplyWithDecimals = supply * 10 ** specification.decimals

		const transaction = new TokenCreateTransaction()
			.setTokenName(name)
			.setTokenSymbol(symbol)
			.setDecimals(specification.decimals)
			.setInitialSupply(supplyWithDecimals)
			.setTreasuryAccountId(Config.accountId)
			.setAdminKey(operatorPrivateKey)
			.setKycKey(operatorPrivateKey)
			.setFreezeKey(operatorPrivateKey)
			.setWipeKey(operatorPrivateKey)
			.setSupplyKey(operatorPrivateKey)
			.setFreezeDefault(false)
			.setMaxTransactionFee(new Hbar(100, HbarUnit.Hbar)) //Change the default max transaction fee
			.setTokenMemo(memo)
			.freezeWith(client)


		const signTx = await (await transaction.sign(operatorPrivateKey)).sign(
			operatorPrivateKey
		)


		const txResponse = await signTx.execute(client)
		const receipt = await txResponse.getReceipt(client)

		const encryptedKey = await Encryption.encrypt(operatorPrivateKey.toString())

		return {
			name,
			symbol,
			memo,
			reference: specification.reference,
			supply: String(supply),
			supplyWithDecimals: String(supplyWithDecimals),
			tokenId: receipt.tokenId.toString(),
			encryptedKey
		}
	}

	createSmartContract = async ({
		encrypted_receiver_key,
		gas,
		file_memo,
	}) => {
		const client = this.#client


		const transactionFile = await new FileCreateTransaction()
			.setKeys(encrypted_receiver_key)
			.setContents(file_memo)
			.setMaxTransactionFee(new Hbar(2))
			.freezeWith(client);

		const signTxFile = await transactionFile.sign(PrivateKey.fromString(Config.adminKey));

		const submitTxFile = await signTxFile.execute(client);

		//Request the receipt
		const receiptFile = await submitTxFile.getReceipt(client);

		//Get the file ID
		const newFileId = receiptFile.fileId;


		if (receipt.status.toString() != "SUCCESS") {
			return false;
		}


		const privateKey = await Encryption.decrypt(encrypted_receiver_key)

		const transaction = new ContractCreateTransaction()
			.setGas(gas)
			.setBytecodeFileId(newFileId)
			.setAdminKey(PrivateKey.fromString(privateKey))
			.freezeWith(client);

		//Modify the default max transaction fee (default: 1 hbar)
		//const modifyTransactionFee = transaction.setMaxTransactionFee(new Hbar(16));

		const txResponse = await modifyTransactionFee.execute(client);

		const receipt = await txResponse.getReceipt(client);

		if (receipt.status.toString() === "SUCCESS") {
			return { ContractID: parseInt(receipt.contractId) }
		}
		else {
			return false;
		}
	}

	getSmartContract = async ({
		contact_id
	}) => {
		const client = this.#client

		const query = new ContractInfoQuery()
			.setContractId(contact_id);

		const info = await query.execute(client);


		return info;
	}

	getSmartContractByteCode = async ({
		contact_id
	}) => {
		const client = this.#client

		const query = new ContractByteCodeQuery()
			.setContractId(contact_id);

		const info = await query.execute(client);


		return info;
	}

	getSmartContractFuction = async ({
		contact_id,
		gas,
		function_name
	}) => {
		const client = this.#client

		const query = new ContractCallQuery()
			.setContractId(contact_id)
			.setGas(gas)
			.setFunction(function_name);

		const contractCallResult = await query.execute(client);

		const message = contractCallResult.getString(0);

		return message;
	}

	updateSmartContract = async ({
		contact_id,
		newadmin_key,
		newmax_fee
	}) => {
		const client = this.#client

		const transaction = await new ContractUpdateTransaction()
			.setContractId(contact_id)
			.setAdminKey(adminKey)
			.setMaxTransactionFee(new Hbar(newmax_fee))
			.freezeWith(client);

		const signTx = null;

		if (newadmin_key.toString() === "") {
			signTx = await (await transaction.sign(newadmin_key)).sign(adminKey);
		}
		else {
			signTx = await transaction.sign(PrivateKey.fromString(Config.adminKey))
        }

		const txResponse = await signTx.execute(client);

		const receipt = await txResponse.getReceipt(client)

		if (receipt.status.toString() === "SUCCESS") {
			return { ContractID: parseInt(receipt.contractId) }
		}
		else {
			return false;
		}
	}

	deleteSmartContract = async ({
		contact_id,
		admin_key
	}) => {
		const client = this.#client

		const query = new ContractInfoQuery()
			.setContractId(contact_id);

		const transaction = await new ContractDeleteTransaction()
			.setContractId(contractId)
			.freezeWith(client);

		const signTx = null;

		if (admin_key.toString() === "") {
			signTx = await transaction.sign(PrivateKey.fromString(Config.adminKey))
		}
		else {
			signTx = await transaction.sign(admin_key.toString())
        }

		const txResponse = await signTx.execute(client);

		const receipt = await txResponse.getReceipt(client);

		if (receipt.status.toString() === "SUCCESS") {
			return { ContractID: parseInt(receipt.contractId) }
		}
		else {
			return false;
		}
	}

	callSmartContract = async ({
		contact_id,
		gas,
		memo,
		submemo
	}) => {
		const client = this.#client

		const transaction = new ContractExecuteTransaction()
			.setContractId(contact_id)
			.setGas(gas)
			.setFunction(memo.toString(), new ContractFunctionParameters()
				.addString(submemo.toString()));

		const txResponse = await transaction.execute(client);

		const receipt = await txResponse.getReceipt(client);

		if(receipt.status.toString() === "SUCCESS") {
			return { ContractID: parseInt(receipt.contractId) }
		}
		else {
			return false;
		}
	}

	
	stakingToken = async ({
		specification = Specification.Fungible,
		token_id,
		sender_id,
        sender_Key,
		receiver_id,
		amount
	}) => {
	    const client = this.#client

		// *** privateKey 알아내기 위한 코드 ***
		// const decrypttest = await Encryption.decrypt(sender_Key)
	    // return {
	    //     sender_Key: sender_Key.toString(),
	    //     decrypttest: decrypttest
	    // }
		// ******************

	    const { tokens } = await new AccountBalanceQuery()
			.setAccountId(sender_id)
			.execute(client);

	    const token = JSON.parse(tokens.toString())[token_id];
	    const adjustedAmountBySpec = amount * 10 ** specification.decimals;

	    if (token < adjustedAmountBySpec) {
	        return false;
	    }

		// sender로부터 받아서 receiver로 준다.
	    let transaction = await new TransferTransaction()
			.addTokenTransfer(token_id, sender_id, -(adjustedAmountBySpec))
			.addTokenTransfer(token_id, receiver_id, adjustedAmountBySpec)
			.freezeWith(client);
			
	    //Sign with the sender account private key
	    const signTx = await transaction.sign(PrivateKey.fromString(sender_Key));

	    //Sign with the client operator private key and submit to a Hedera network
	    const txResponse = await signTx.execute(client);

		//Request the receipt of the transaction
		const receipt = await txResponse.getReceipt(client);

		//Get the transaction consensus status
		const transactionStatus = receipt.status;

		console.log("The transaction consensus status " + transactionStatus.toString());

		if (transactionStatus.toString() === "SUCCESS")
		{
			// const balance = await new AccountBalanceQuery()
			// 	.setAccountId(sender_id)
			// 	.execute(client);
	
			//const senderbalance = balance.tokens._map.get([token_id].toString()).toString();

			return {
				transactionId: transaction.transactionId.toString(),
				balance: parseFloat(0)
			}
		}
		elsez
		{
			return false;
		}
	}

	updateToken = async ({
		token_id,
		token_simbol
	}) => {
	    const client = this.#client

	    const transaction = await new TokenUpdateTransaction()
     		.setTokenId(token_id)
     		.setTokenSymbol(token_simbol)
     		.freezeWith(client);

		const operatorPrivateKey = PrivateKey.fromString(Config.privateKey)

		//Sign the transaction with the admin key
		const signTx = await transaction.sign(operatorPrivateKey);

		//Submit the signed transaction to a Hedera network
		const txResponse = await signTx.execute(client);

		//Request the receipt of the transaction
		const receipt = await txResponse.getReceipt(client);

		//Get the transaction consensus status
		const transactionStatus = receipt.status.toString();

		console.log("The transaction consensus status is " + transactionStatus);
	}

	associateToken = async ({
		privateKey,
		account_id,
		token_id,
	}) => {
		const client = this.#client

		console.log("privateKey : " + privateKey);
		console.log("account_id : " + account_id);
		console.log("token_id : " + token_id);

		const balance = await new AccountBalanceQuery()
			.setAccountId(account_id)
			.execute(client)

		if (balance == null) {
			return false;
		}

		if (balance.tokens._map.has(token_id) == true) {

			return false;
		}

		const transaction = await new TokenAssociateTransaction()
			.setAccountId(account_id)
			.setTokenIds([token_id])
			.freezeWith(client)

		console.log("transaction : Complete");

		const signTx = await transaction.sign(PrivateKey.fromString(privateKey))

		return await signTx.execute(client)
	}

	// 유저 nft 조회
	userAccountNFT = async ({
		account_id
	}) => {
	    const client = this.#client

		const balance = await new AccountBalanceQuery()
			.setAccountId(account_id)
			.execute(client);

		if (balance == null) {
			return null;
		}

		if (balance.tokens == null) {
			return null;
		}

		return {
			account_id,
			balance
		}
	}

	getNFTMetaData = async ({
		nft_id,
		serialNum
	}) => {
	    const client = this.#client

		const nftTokenID = TokenId.fromString(nft_id);
		console.log(nftTokenID.toString());

		const nftInfos = await new TokenNftInfoQuery()
     		.setNftId( new NftId(nftTokenID, serialNum) )
     		.execute(client);

		if(nftInfos == null)
		{
			return null;
		}

		if(nftInfos.length == 0)
		{
			return null;
		}

		// NFT의 메타데이터 가져오기
		const metaByte = nftInfos[0].metadata;
		if(metaByte == null){
			console.log("metaByte null");
			return null;
		}

		console.log(metaByte.toString());
		// CID 추출
		const cid = new Buffer.from(metaByte).toString();

		return cid;
	}

	getNFTDatas = async ({
		nft_id,
		serialNum
	}) => {
	    const client = this.#client

		const nftTokenID = TokenId.fromString(nft_id);
		console.log(nftTokenID.toString());

		// const nftInfos = await new TokenNftInfoQuery()
     	// 	.setNftId(new NftId(nftTokenID, serialNum))
     	// 	.execute(client);

		const tokenInfos = await new TokenGetInfoQuery()
			.setTokenId(nftTokenID)
			.execute(client);

		if(tokenInfos == null)
		{
			return null;
		}

		return tokenInfos;
	}

	// transferNFT = async ({
	// 	nft_id,
	// 	accountID
	// }) => {
	// 	return null;
	// }
}

export default HashgraphClient
