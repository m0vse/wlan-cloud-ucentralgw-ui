import * as React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { isRFC1918 } from 'helpers/ipCountry';

type Props = { address?: string; country?: string; style?: React.CSSProperties };

const AddressFlag = ({ address = '', country = '', style }: Props) => {
  if (isRFC1918(address)) {
    return (
      <ReactCountryFlag
        cdnUrl="/flags/"
        countryCode="rfc1918"
        style={style}
        title="RFC1918"
        alt="RFC1918"
        svg
      />
    );
  }
  return country ? <ReactCountryFlag style={style} countryCode={country} svg /> : null;
};

export default AddressFlag;
