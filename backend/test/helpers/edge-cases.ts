/**
 * Synthetic pages, shaped like the current auto-data.net markup, that exist
 * only to reach defensive paths a real page does not contain: a missing href, a
 * link without its label, a year cell that never appears, a gallery image
 * without a src, a row missing one of its two cells.
 *
 * These are deliberately NOT used to prove the scraper works - that is
 * scraper-fetch.test.ts's job, against recorded real pages. If the site's layout
 * changes, these keep passing (they do not claim anything about the site) and
 * the recorded-page tests are the ones that fail.
 */

/** div.brands > a: no href (dropped), no label, no image, and a normal row. */
export const BRANDS_WITH_GAPS = `
  <div class="brands">
    <a href="/en/bmw-brand-1"><strong>BMW</strong><img src="/img/bmw.png"></a>
    <a href="/en/no-label-brand-2"></a>
    <a href="/en/no-image-brand-3"><strong>No image</strong></a>
    <a><strong>Dropped: no href</strong></a>
    <a href="/en"><strong>Dropped: no slug</strong></a>
  </div>
`;

/**
 * The three src shapes an image URL has to survive: already absolute (a CDN),
 * root-relative (what the site writes), and bare relative (a missing leading
 * slash, which would otherwise resolve against the page's directory rather than
 * the site root).
 */
export const BRANDS_WITH_IMAGE_URL_SHAPES = `
  <div class="brands">
    <a href="/en/absolute-brand-1"><strong>Absolute</strong>
      <img src="https://cdn.example.com/logos/absolute.png"></a>
    <a href="/en/root-relative-brand-2"><strong>Root relative</strong>
      <img src="/img/root-relative.png"></a>
    <a href="/en/bare-relative-brand-3"><strong>Bare relative</strong>
      <img src="img/bare-relative.png"></a>
  </div>
`;

/** a.modeli: no label, no year cell, no image, and a normal row. */
export const MODELS_WITH_GAPS = `
  <a class="modeli" href="/en/3-series-model-5">
    <strong>3 Series</strong><div> 2019 - 2026 </div><img src="/img/3-series.png">
  </a>
  <a class="modeli" href="/en/open-ended-model-6">
    <strong>Open ended</strong><div>2011 - </div>
  </a>
  <a class="modeli" href="/en/single-year-model-7">
    <strong>Single year</strong><div>2000</div>
  </a>
  <a class="modeli" href="/en/bare-model-8"></a>
  <a class="modeli"><strong>Dropped: no href</strong></a>
`;

/** div.generr div.f: .end and .cur years, missing label/image/chassis/years. */
export const GENERATIONS_WITH_GAPS = `
  <div class="generr" id="generr">
    <div id="1" class="f lred">
      <a href="/en/3-series-generation-30" class="position">
        <img src="/img/gen/3.png"><strong class="tit">3 Series (3)</strong>
      </a>
      <div class="i"><a class="position">
        <strong class="end">2005 - 2011</strong> <strong class="chas">E46</strong>
      </a></div>
    </div>
    <div id="2" class="f">
      <a href="/en/current-generation-31" class="position">
        <strong class="tit">Current</strong>
      </a>
      <div class="i"><a class="position">
        <strong class="cur">2019 -</strong> <strong class="chas">G20</strong>
      </a></div>
    </div>
    <div id="3" class="f">
      <a href="/en/bare-generation-32" class="position"></a>
    </div>
    <div id="4" class="f">
      <a class="position"><strong class="tit">Dropped: no href</strong></a>
    </div>
  </div>
`;

/** div.carlist div.tri, plus a gallery holding an img without a src. */
export const TRIMS_WITH_GAPS = `
  <div class="carTitimg">
    <img src="/img/trims/320.png">
    <img>
  </div>
  <div class="carlist">
    <div class="h">Start of production 2005; End of production 2011 | Sedan</div>
    <div class="tri lred">
      <div class="thi"><a href="/en/320i-trim-1">
        <strong><span class="tit"> 320i </span> <span class="end">2005 - 2011</span></strong>
      </a></div>
    </div>
    <div class="tri lred">
      <div class="thi"><a href="/en/current-trim-2">
        <strong><span class="tit">Current</span> <span class="cur">2019 -</span></strong>
      </a></div>
    </div>
    <div class="tri">
      <div class="thi"><a href="/en/bare-trim-3"></a></div>
    </div>
    <div class="tri">
      <div class="thi"><a><strong><span class="tit">Dropped: no href</span></strong></a></div>
    </div>
  </div>
`;

/** div.cardetailsout div.row: rows missing a cell, an empty label, locked data. */
export const DETAILS_WITH_GAPS = `
  <div class="cardetailsout">
    <div class="cardetails">
      <div class="row"><div class="par">Brand</div><div class="val">BMW</div></div>
      <div class="row"><div class="par">Engine oil specification</div><div class="val">5W-30</div></div>
      <div class="row"><div class="par">Engine oil specification</div>
        <div class="val"><img class="datalock" src="/img/lock.png" alt="Log in to see."><a href="/en/login">Log in to see.</a></div>
      </div>
      <div class="row"><div class="par">Coolant capacity</div><div class="val">7 l</div></div>
      <div class="row"><div class="par">Assisting systems</div>
        <div class="val">ABS<br>ESP<br>TCS</div>
      </div>
      <div class="row"><div class="val">row without a label</div></div>
      <div class="row"><div class="par">row without a value</div></div>
      <div class="row"><div class="par"></div><div class="val">row with an empty label</div></div>
      <div class="row"><div class="par">Not a column the entity has</div><div class="val">ignored</div></div>
    </div>
    <div class="cardetails">
      <h2>Performance</h2>
      <div class="row"><div class="par">Fuel consumption (extra urban)</div><div class="val">6.4 l/100 km</div></div>
      <div class="row"><div class="par">Fuel consumption (combined)</div><div class="val">8.1 l/100 km</div></div>
      <div class="row"><div class="par">CO2 emissions</div><div class="val">189 g/km</div></div>
      <div class="row"><div class="par">Maximum engine speed</div><div class="val">6000 rpm</div></div>
      <div class="row"><div class="par">Torque</div><div class="val">270 Nm</div></div>
      <div class="row"><div class="par">Weight-to-torque ratio</div><div class="val">42.5 kg/Nm</div></div>
    </div>
    <div class="cardetails">
      <h2>Engine</h2>
      <div class="row"><div class="par">Engine code</div><div class="val">N52B25</div></div>
      <div class="row"><div class="par">Engine displacement</div><div class="val">2494 cc</div></div>
    </div>
    <div class="cardetails">
      <h2>Volume and weights</h2>
      <div class="row"><div class="par">Trunk volume</div><div class="val">480 l</div></div>
      <div class="row"><div class="par">Max. roof load</div><div class="val">75 kg</div></div>
      <div class="row"><div class="par">Permitted trailer load with brakes</div><div class="val">1800 kg</div></div>
      <div class="row"><div class="par">Permitted trailer load without brakes</div><div class="val">750 kg</div></div>
      <div class="row"><div class="par">Permitted towbar download</div><div class="val">100 kg</div></div>
    </div>
    <div class="cardetails">
      <h2>Dimensions</h2>
      <div class="row"><div class="par">Width including mirrors</div><div class="val">1978 mm</div></div>
      <div class="row"><div class="par">Ground clearance</div><div class="val">140 mm</div></div>
      <div class="row"><div class="par">Drag coefficient</div><div class="val">0.29</div></div>
      <div class="row"><div class="par">Minimum turning circle</div><div class="val">11.3 m</div></div>
    </div>
    <div class="cardetails">
      <h2>Tyres</h2>
      <div class="row"><div class="par">Tire size</div><div class="val">205/55 R16</div></div>
    </div>
  </div>
`;