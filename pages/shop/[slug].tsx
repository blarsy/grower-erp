import { useRouter } from "next/router"
import CustomerOrder from "lib/components/CustomerOrder"

const Order = () => {
    const router = useRouter()
    const { slug } = router.query

    return <CustomerOrder slug={slug as string} />
}

export default Order