import onlyPost from "app/middleware/onlyPost"
import withAuthentication from "app/middleware/withAuthentication"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import SendNFTHandler from "app/handler/sendNFTHandler"
import ensureEncryptionKey from "app/middleware/ensureEncryptionKey"

export default prepare(
	onlyPost,
	ensureEncryptionKey,
	withAuthentication,
	useHashgraphContext
)(SendNFTHandler)
