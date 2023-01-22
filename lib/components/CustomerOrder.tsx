interface Props {
    slug: string
}

const CustomerOrder = ({ slug }: Props) => {
    return <span>Slug: {slug}</span>
}

export default CustomerOrder