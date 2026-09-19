import React from 'react';
import { Button, Underlined } from './primitives';
import { IMG } from './content';

const VALUES = ['Care', 'Connect', 'Explore', 'Belong'];

export function TCFinalCTA() {
  return (
    <>
      <section className="tc-final" id="community" aria-labelledby="tc-final-title">
        <div className="tc-final__media" aria-hidden="true">
          <img
            src={IMG.community}
            alt=""
            loading="lazy"
            decoding="async"
            width="1600"
            height="900"
          />
        </div>
        <div className="tc-final__scrim" aria-hidden="true" />

        <div className="tc-shell tc-final__inner">
          <div className="tc-final__copy tc-rv">
            <h2 className="tc-h2" id="tc-final-title">
              Better days start
              <br />
              with{' '}
              <span className="tc-accent">
                <Underlined>one circle.</Underlined>
              </span>
            </h2>
            <p className="tc-lead">
              Join thousands of pet parents across Lake Norman.
            </p>
            <div className="tc-btn-row">
              <Button href="/auth/signup" variant="primary">
                Join the Circle
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="tc-valuestrip">
        {VALUES.map((v, i) => (
          <React.Fragment key={v}>
            {i > 0 && <span className="tc-dot" aria-hidden="true">•</span>}
            <span>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

export default TCFinalCTA;
