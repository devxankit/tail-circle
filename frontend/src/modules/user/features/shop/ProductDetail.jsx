import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Heart, Plus, Minus, ShoppingBag, Star, ChevronDown, ChevronUp, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchProduct,
  addToCart as addToCartApi,
  toggleSavedItem,
  fetchSavedItems,
} from '../../../../services/shop';
import { api } from '../../../../services/api';
import { ProductImage } from './ProductImage';

export function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState('Features');

  // Product from the API (by legacy id or ObjectId)
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedPackSize, setSelectedPackSize] = useState(null);

  // Live reviews + inline write-review form
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [myRating, setMyRating] = useState(5);
  const [myReviewText, setMyReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadReviews = (productDocId) => {
    api
      .get('/reviews', { params: { targetType: 'product', targetId: productDocId } })
      .then(({ data }) =>
        setReviews(
          data.map((r) => ({
            id: r._id,
            name: r.userId?.name || 'Pet Parent',
            verified: r.verifiedPurchase,
            rating: r.rating,
            location: new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
            title: '',
            body: r.text,
          }))
        )
      )
      .catch(() => setReviews([]));
  };

  useEffect(() => {
    fetchProduct(id)
      .then((p) => {
        setProduct(p);
        setSelectedVariant(p.variants?.[0]?.name || '');
        setSelectedPackSize(p.packSizes?.[0] || null);
        loadReviews(p._id);
      })
      .catch(() => navigate('/app/shop', { replace: true }));
    fetchSavedItems()
      .then((saved) => setIsFavorite(saved.some((s) => String(s.product?.legacyId ?? s.targetId) === String(id))))
      .catch(() => {});
  }, [id]);

  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    try {
      await api.post('/reviews', {
        targetType: 'product',
        targetId: product._id,
        rating: myRating,
        text: myReviewText.trim(),
      });
      setShowReviewForm(false);
      setMyReviewText('');
      loadReviews(product._id);
    } catch {
      /* form stays open for retry */
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!product) {
    return (
      <div className="flex flex-col h-full bg-white absolute inset-0 z-50 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-main" />
      </div>
    );
  }

  const finalPrice = selectedPackSize ? selectedPackSize.price : product.price;

  const handleToggleFavorite = () => {
    const next = !isFavorite;
    setIsFavorite(next);
    toggleSavedItem(product._id, !next).catch(() => setIsFavorite(!next));
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on TailCircle for just ₹${finalPrice.toFixed(2)}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Product link copied to clipboard!');
      }
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleAddToCart = () => {
    const packSizeIndex = Math.max(
      0,
      (product.packSizes || []).findIndex((ps) => ps.size === selectedPackSize?.size)
    );
    addToCartApi(product, { packSizeIndex, qty: quantity }).catch(() => {});
    setAdded(true);
    setTimeout(() => {
      navigate('/app/shop/cart');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white absolute inset-0 z-50 animate-in slide-in-from-bottom-full duration-300">
      
      {/* Top action buttons (floating) */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-text-primary">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-3">
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-text-primary">
            <Share2 size={20} />
          </button>
          <button onClick={handleToggleFavorite} className="w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
            <Heart size={20} className={isFavorite ? "fill-error text-error" : "text-text-primary"} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 bg-white">
        
        {/* Horizontal Image Carousel */}
        <div className="relative w-full h-[380px] bg-[#FAF7F2]">
           {product.badge && (
             <span className={`absolute top-4 left-4 ${product.badgeColor || 'bg-[#BA5C4E]'} text-white text-xs font-bold px-3 py-1 rounded-br-xl rounded-tl-xl z-10 shadow-sm`}>
               {product.badge}
             </span>
           )}
           {/* "Get it today" badge */}
           <div className="absolute bottom-4 left-4 bg-[#66B4B1] text-white text-sm font-bold px-3 py-1.5 rounded-lg z-10 flex items-center gap-1 shadow-md">
             <Zap size={16} className="fill-white" /> Get it today
           </div>

           <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar">
             {(product.images || [product.img]).map((imgSrc, idx) => (
               <div key={idx} className="min-w-full w-full h-full flex-shrink-0 snap-center relative">
                 <ProductImage src={imgSrc} alt={`${product.name} ${idx}`} className="w-full h-full object-cover p-4 mix-blend-multiply" />
               </div>
             ))}
           </div>
           
           {/* Pagination dots */}
           {(product.images && product.images.length > 1) && (
             <div className="absolute bottom-4 left-0 w-full flex justify-center gap-1.5 z-10">
               {product.images.map((_, idx) => (
                 <div key={idx} className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-primary-main' : 'bg-black/20'}`} />
               ))}
             </div>
           )}
        </div>

        {/* Product Details Section */}
        <div className="p-4 bg-white">
          <div className="flex justify-between items-start mb-1">
             <span className="text-[#599D9A] font-bold text-sm">{product.brand || 'TailCircle'}</span>
             <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded text-xs font-bold">
               <Star size={12} className="fill-[#F87B68] text-[#F87B68]" /> {product.rating}
             </div>
          </div>
          
          <h1 className="text-xl font-bold text-text-primary leading-snug mb-3">{product.name}</h1>
          
          {product.tag && (
            <span className="inline-block bg-[#FAF7F2] text-text-primary text-xs font-bold px-3 py-1.5 rounded-lg mb-4">
              {product.tag}
            </span>
          )}

          {/* Variants */}
          {product.variants && (
            <div className="mb-5">
              <p className="text-sm text-text-secondary mb-2">Variant : <span className="font-bold text-text-primary">{selectedVariant}</span></p>
              <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-1">
                {product.variants.map((v, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedVariant(v.name)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-xl whitespace-nowrap transition-colors ${selectedVariant === v.name ? 'border-[#F87B68] border-2 bg-white' : 'border-border-light bg-white'}`}
                  >
                    <div className="w-6 h-6 bg-[#FAF7F2] rounded overflow-hidden">
                      <ProductImage src={v.img} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-bold text-text-primary">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pack Sizes */}
          {product.packSizes && (
            <div className="mb-6">
              <p className="text-sm text-text-secondary mb-2">Pack Size: <span className="font-bold text-text-primary">{selectedPackSize?.size}</span></p>
              <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
                {product.packSizes.map((ps, idx) => {
                  const isSelected = selectedPackSize?.size === ps.size;
                  return (
                    <button 
                      key={idx}
                      onClick={() => setSelectedPackSize(ps)}
                      className={`flex flex-col border rounded-xl overflow-hidden shrink-0 transition-colors w-[110px] ${isSelected ? 'border-[#F87B68] border-2' : 'border-border-light'}`}
                    >
                      <div className={`p-2 text-center text-sm font-bold ${isSelected ? 'bg-[#FCEAE7] text-text-primary' : 'bg-[#FAF7F2] text-text-primary'}`}>
                        {ps.size}
                      </div>
                      <div className="p-3 bg-white flex flex-col justify-center items-center h-full">
                        <span className="font-black text-lg text-text-primary">₹{ps.price}</span>
                        {ps.discount > 0 && (
                          <>
                            <span className="text-xs text-text-secondary line-through">MRP ₹{ps.mrp}</span>
                            <span className="text-xs font-bold text-[#66B4B1] mt-1">{ps.discount}% OFF</span>
                          </>
                        )}
                        {ps.discount === 0 && (
                          <span className="text-xs text-text-secondary mt-1 font-bold">MRP ₹{ps.mrp}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full h-2 bg-[#FAF7F2]"></div>

        {/* Product Overview (Accordions) */}
        <div className="p-4 bg-white">
          <h2 className="text-lg font-bold text-text-primary mb-4">Product Overview</h2>
          
          <div className="border-b border-border-light py-4">
            <button className="flex justify-between items-center w-full" onClick={() => setOpenAccordion(openAccordion === 'Features' ? '' : 'Features')}>
              <span className="font-bold text-text-primary">Features</span>
              {openAccordion === 'Features' ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
            </button>
            {openAccordion === 'Features' && (
              <div className="mt-4 flex flex-col items-center">
                {product.overviewImage ? (
                  <div className="w-full rounded-xl overflow-hidden bg-gradient-to-br from-[#D96B5B] to-[#BA5C4E] p-6 flex flex-col items-center justify-center text-white relative h-64">
                    <Heart size={32} className="fill-white mb-2" />
                    <span className="text-3xl font-black mb-1">{product.brand}</span>
                    <span className="text-xs tracking-widest font-medium uppercase opacity-90 mb-6">Complete Wet Meals</span>
                    <ProductImage src={product.overviewImage} className="w-24 h-24 object-contain opacity-50 absolute bottom-0" />
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">{product.description}</p>
                )}
                <button className="text-[#F87B68] font-bold text-sm mt-4 flex items-center gap-1 border-b border-[#F87B68]">
                  Show Full Image <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="border-b border-border-light py-4">
            <button className="flex justify-between items-center w-full" onClick={() => setOpenAccordion(openAccordion === 'Desc' ? '' : 'Desc')}>
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-text-primary">Product Description</span>
                <span className="text-xs text-text-secondary mt-0.5">Benefits, Ingredients, Usage & More</span>
              </div>
              {openAccordion === 'Desc' ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
            </button>
            {openAccordion === 'Desc' && (
              <div className="mt-4 text-sm text-text-secondary leading-relaxed">
                {product.description}
              </div>
            )}
          </div>

          <div className="border-b border-border-light py-4">
             <button className="flex justify-between items-center w-full" onClick={() => setOpenAccordion(openAccordion === 'Info' ? '' : 'Info')}>
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-text-primary">Additional Information</span>
                <span className="text-xs text-text-secondary mt-0.5">Brand, Product Type, Manufacture Details and More</span>
              </div>
              {openAccordion === 'Info' ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
            </button>
          </div>

          <div className="py-4">
             <button className="flex justify-between items-center w-full" onClick={() => setOpenAccordion(openAccordion === 'FAQ' ? '' : 'FAQ')}>
              <span className="font-bold text-text-primary">Frequently Asked Questions</span>
              {openAccordion === 'FAQ' ? <ChevronUp size={20} className="text-text-secondary" /> : <ChevronDown size={20} className="text-text-secondary" />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-2 bg-[#FAF7F2]"></div>

        {/* Customer Reviews Section */}
        {product.reviewsData && (
          <div className="p-4 bg-white">
            <h2 className="text-lg font-bold text-text-primary mb-4">Customer Reviews</h2>
            
            <div className="flex items-center gap-1 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} size={20} className="fill-[#F87B68] text-[#F87B68]" />)}
            </div>
            <p className="text-sm text-text-secondary mb-4">Based on {product.reviewsData.total} review</p>

            <div className="flex gap-3 mb-6">
              <button onClick={() => setShowReviewForm((v) => !v)} className="flex-1 py-2 rounded-full border border-[#66B4B1] text-[#66B4B1] font-bold text-sm hover:bg-[#FAF7F2] transition-colors">Write a review</button>
              <button className="flex-1 py-2 rounded-full border border-[#66B4B1] text-[#66B4B1] font-bold text-sm hover:bg-[#FAF7F2] transition-colors">Ask a question</button>
            </div>

            {showReviewForm && (
              <div className="border border-border-light rounded-2xl p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} onClick={() => setMyRating(i)}>
                      <Star size={24} className={i <= myRating ? 'fill-[#F87B68] text-[#F87B68]' : 'text-text-disabled'} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows="3"
                  value={myReviewText}
                  onChange={(e) => setMyReviewText(e.target.value)}
                  placeholder="Share your experience with this product…"
                  className="w-full bg-[#FAF7F2] border border-border-light rounded-xl px-3 py-2 text-sm outline-none focus:border-[#66B4B1] resize-none mb-3"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  className="w-full py-2.5 rounded-full bg-[#66B4B1] text-white font-bold text-sm disabled:opacity-60"
                >
                  {isSubmittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 mb-6">
               {product.reviewsData.breakdown.map((percent, idx) => {
                 const stars = 5 - idx;
                 return (
                   <div key={idx} className="flex items-center gap-2">
                     <div className="flex gap-0.5 w-24">
                       {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= stars ? "fill-[#F87B68] text-[#F87B68]" : "text-text-disabled"} />)}
                     </div>
                     <div className="flex-1 h-3 bg-[#FAF7F2] rounded-full overflow-hidden border border-border-light">
                       <div className="h-full bg-[#F87B68]" style={{width: `${percent}%`}}></div>
                     </div>
                     <span className="text-xs text-text-secondary w-16">{percent}% ({(percent/100 * product.reviewsData.total).toFixed(0)})</span>
                   </div>
                 )
               })}
            </div>

            <select className="border border-border-light rounded px-3 py-1.5 text-sm text-text-primary bg-white mb-6 outline-none">
              <option>Pictures First</option>
              <option>Recent</option>
              <option>Highest Rating</option>
            </select>

            {/* Review Cards */}
            <div className="flex flex-col gap-4">
              {reviews.map(review => (
                <div key={review.id} className="border border-border-light rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center font-black text-xl text-text-primary relative">
                      {review.name.charAt(0)}
                      {review.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                           <CheckCircle2 size={16} className="fill-[#F6C0B6] text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">{review.name}</span>
                        <div className="flex gap-0.5">
                           {[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= review.rating ? "fill-[#F87B68] text-[#F87B68]" : "text-text-disabled"} />)}
                        </div>
                      </div>
                      <span className="text-xs text-text-disabled">{review.location}</span>
                    </div>
                  </div>
                  {review.verified && (
                     <span className="bg-[#F87B68] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm mb-2 inline-block">Verified</span>
                  )}
                  <h4 className="font-bold text-text-primary mb-1">{review.title}</h4>
                  <p className="text-sm text-text-secondary">{review.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer Cart Area */}
      <div 
        className="absolute bottom-0 w-full bg-white border-t border-border-light px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 flex items-center gap-4"
        style={{
          paddingTop: '12px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))'
        }}
      >
         <div className="flex flex-col min-w-[80px]">
           <span className="text-xs text-text-secondary line-through">MRP ₹{selectedPackSize ? selectedPackSize.mrp : product.price}</span>
           <span className="font-black text-xl text-text-primary">₹{finalPrice * quantity}</span>
         </div>
         <button 
           onClick={handleAddToCart}
           className="flex-1 bg-[#F87B68] hover:bg-[#D96B5B] text-white font-black text-base py-3 rounded-xl shadow-[0_4px_10px_rgba(234,88,12,0.3)] transition-colors active:scale-95 flex justify-center items-center cursor-pointer"
         >
           {added ? 'Added to Cart' : 'Add to Cart'}
         </button>
      </div>

    </div>
  );
}
