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
	ContractCallQuery
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



		//const tokenInfo = balance.tokens._map.get([token_id].toString());
		//const privateKey = PrivateKey.fromString("")
		//const encryptedKey = await Encryption.encrypt(privateKey.toString())
		//console.log("Key : " + encryptedKey)


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
		encrypted_receiver_key,
		token_id,
		receiver_id,
		amount
	}) => {
		const client = this.#client

		const adjustedAmountBySpec = amount * 10 ** specification.decimals

		const signature = await new TransferTransaction()
			.addTokenTransfer(token_id, Config.accountId, -adjustedAmountBySpec)
			.addTokenTransfer(token_id, receiver_id, adjustedAmountBySpec)
			.execute(client)

		console.log("-----------0>" + signature.transactionId);

		if (signature == null) {

			return false;
		}

		const receipt = await signature.getReceipt(client);

		console.log("-----------1>" + receipt.status.toString() );


		const balance = await new AccountBalanceQuery()
			.setAccountId(receiver_id)
			.execute(client)


		const recverbalance = balance.tokens._map.get([token_id].toString()).toString();

		if (receipt.status.toString() === "SUCCESS") {
			return { balance: parseFloat(recverbalance) }
		}
		else {
			return false;
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

		//Request the receipt of the transaction
		const receipt = await txResponse.getReceipt(client);

		//Obtain the transaction consensus status
		const transactionStatus = receipt.status;

		const balance = await new AccountBalanceQuery()
			.setAccountId(sender_id)
			.execute(client)

		const senderbalance = balance.tokens._map.get([token_id].toString()).toString();


		if (transactionStatus.toString() === "SUCCESS") {
			return { balance: parseFloat(senderbalance) }
		}
		else {
			return false;
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


		const privatekey = PrivateKey.fromString(Config.privateKey);

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
		const privatekey = PrivateKey.fromString(Config.privateKey);

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

	enableUserAccountToken = async ({
		encrypted_receiver_key,
		acount_id,
		token_id
	}) => {
		const client = this.#client

		//const privateKey = await Encryption.decrypt(encrypted_receiver_key)
		////Sign with the freeze key of the token
		//
		//// -계정에 토큰 연관성 설정
		//const transaction = await new TokenAssociateTransaction()
		//	.setAccountId(acount_id)
		//	.setTokenIds([token_id])
		//	.freezeWith(client);
		//
		////Sign with the private key of the account that is being associated to a token 
		//const signTx = await transaction.sign(PrivateKey.fromString(privateKey));
		//const response = signTx.execute(client);
		//
		////KYC 부여
		//const revokeKyctransaction = await new TokenGrantKycTransaction()
		//	.setAccountId(acount_id)
		//	.setTokenId(token_id)
		//	.freezeWith(client);
			
			
		//Sign with the kyc private key of the token
		const signrevokeKycTx = await revokeKyctransaction.sign(PrivateKey.fromString(Config.privateKey));
			
		//Submit the transaction to a Hedera network    
		const txKycResponse = await signrevokeKycTx.execute(client);
			
		//Request the receipt of the transaction
		const receiptKyc = await txKycResponse.getReceipt(client);
			
			
		console.log("The transaction consensus status " + receiptKyc.status.toString());
			
		if (receiptKyc.status.toString() === "SUCCESS") {
			return {
				acount_id,
				token_id,
			}
		}
		else {
			return false;
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

		const signTxFile = await transactionFile.sign(PrivateKey.fromString(Config.privateKey));

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
			signTx = await transaction.sign(PrivateKey.fromString(Config.privateKey))
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
			signTx = await transaction.sign(PrivateKey.fromString(Config.privateKey))
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
}

export default HashgraphClient
